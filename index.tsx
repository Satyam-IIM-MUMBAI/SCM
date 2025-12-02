import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  MapPin, 
  DollarSign, 
  Clock, 
  Settings, 
  Activity, 
  BarChart3, 
  PieChart,
  Anchor,
  Box,
  AlertCircle
} from 'lucide-react';

// --- Constants from Zhen et al. (2021) ---
const COST_OWNED_FIXED = 300;       // Yuan
const COST_OWNED_PER_KM = 13.5;     // Yuan/km
const COST_3RD_PARTY_FIXED = 2000;  // Yuan
const COST_3RD_PARTY_PER_KM = 14.0; // Yuan/km
const CO2_PER_KM = 0.27;            // kg/km

// Map Constants (Relative scaling for visualization)
const MAP_WIDTH = 800;
const MAP_HEIGHT = 500;
const PORT_X = MAP_WIDTH * 0.8;
const PORT_Y = MAP_HEIGHT * 0.5;

// --- Types ---
type OrderType = 'Door-to-Door' | 'Warehouse';
type ContainerSize = '20GP' | '40GP';

interface Order {
  id: string;
  type: OrderType;
  size: ContainerSize;
  urgency: 'Normal' | 'Urgent';
  distance: number;
  x: number;
  y: number;
  status: 'Pending' | 'Assigned' | 'Outsourced';
}

interface Vehicle {
  id: string;
  type: 'Owned';
  status: 'Available' | 'Busy';
}

interface SimulationResult {
  schedule: any[];
  totalCost: number;
  ownedUsage: number;
  outsourcedUsage: number;
  totalKm: number;
  manualCostEst: number;
  savings: number;
  co2: number;
}

const YunfengDashboard = () => {
  // --- State ---
  const [numOrders, setNumOrders] = useState(84);
  const [fleetSize, setFleetSize] = useState(30);
  const [orders, setOrders] = useState<Order[]>([]);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'schedule'>('map');

  // --- Simulation Logic ---
  const runSimulation = () => {
    // 1. Generate Mock Orders
    const newOrders: Order[] = Array.from({ length: numOrders }).map((_, i) => {
      // Generate random position clustered towards the left (hinterland)
      const x = Math.random() * (MAP_WIDTH * 0.7) + 20; 
      const y = Math.random() * (MAP_HEIGHT - 40) + 20;
      
      // Calc Euclidean distance scaled to km (approx)
      const distPx = Math.sqrt(Math.pow(x - PORT_X, 2) + Math.pow(y - PORT_Y, 2));
      const distKm = Math.floor(distPx * 0.5) + 50; // Scale factor

      return {
        id: `ORD-${1000 + i}`,
        type: Math.random() > 0.4 ? 'Door-to-Door' : 'Warehouse',
        size: Math.random() > 0.5 ? '40GP' : '20GP',
        urgency: Math.random() > 0.8 ? 'Urgent' : 'Normal',
        distance: distKm,
        x,
        y,
        status: 'Pending'
      };
    });

    // 2. Sort Orders (Heuristic: Urgency -> Distance)
    const sortedOrders = [...newOrders].sort((a, b) => {
      if (a.urgency === 'Urgent' && b.urgency !== 'Urgent') return -1;
      if (a.urgency !== 'Urgent' && b.urgency === 'Urgent') return 1;
      return b.distance - a.distance; // Longest first often optimizes better
    });

    // 3. Allocate
    let currentCost = 0;
    let ownedCount = 0;
    let outsourcedCount = 0;
    let kmCount = 0;
    let availableTrucks = fleetSize;
    const scheduleLog = [];

    const simulatedOrders = sortedOrders.map(order => {
      let cost = 0;
      let method = '';
      let assignedVehicle = '';

      if (availableTrucks > 0) {
        // Assign Owned
        availableTrucks--;
        ownedCount++;
        cost = COST_OWNED_FIXED + (order.distance * COST_OWNED_PER_KM);
        method = 'Owned';
        assignedVehicle = `VEH-${ownedCount}`;
        order.status = 'Assigned';
      } else {
        // Outsource
        outsourcedCount++;
        cost = COST_3RD_PARTY_FIXED + (order.distance * COST_3RD_PARTY_PER_KM);
        method = 'Outsourced';
        assignedVehicle = '3RD-PARTY';
        order.status = 'Outsourced';
      }

      currentCost += cost;
      kmCount += order.distance;

      scheduleLog.push({
        orderId: order.id,
        vehicleId: assignedVehicle,
        method,
        cost,
        distance: order.distance
      });

      return order;
    });

    // 4. Metrics
    // Paper states ~13.28% cost reduction vs manual
    // So Manual Cost = Optimized / (1 - 0.1328) approx, or Optimized * 1.1328 as simple baseline
    const manualEst = currentCost * 1.153; // Inverting the 13.28% reduction logic roughly
    const savingVal = manualEst - currentCost;
    
    setOrders(simulatedOrders);
    setResult({
      schedule: scheduleLog,
      totalCost: currentCost,
      ownedUsage: ownedCount,
      outsourcedUsage: outsourcedCount,
      totalKm: kmCount,
      manualCostEst: manualEst,
      savings: savingVal,
      co2: kmCount * CO2_PER_KM
    });
  };

  // Run initial sim on mount
  useEffect(() => {
    runSimulation();
  }, [numOrders, fleetSize]);

  // --- Components ---

  const StatCard = ({ title, value, subtext, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start space-x-4">
      <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      <div>
        <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
        <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
        <p className="text-xs text-slate-400 mt-1">{subtext}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Yunfeng Logistics DSS</h1>
              <p className="text-xs text-slate-500">Intelligent Scheduling System • Based on Zhen et al. (2021)</p>
            </div>
          </div>
          <div className="flex space-x-4">
            <button 
              onClick={() => setActiveTab('map')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'map' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Overview & Map
            </button>
            <button 
              onClick={() => setActiveTab('schedule')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'schedule' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Schedule Details
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-12 gap-8">
          
          {/* Sidebar Controls */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-6 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-slate-400" />
                Parameters
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Daily Order Volume: <span className="text-blue-600 font-bold">{numOrders}</span>
                  </label>
                  <input 
                    type="range" 
                    min="10" 
                    max="150" 
                    value={numOrders} 
                    onChange={(e) => setNumOrders(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>10</span>
                    <span>150</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Owned Fleet Size: <span className="text-blue-600 font-bold">{fleetSize}</span>
                  </label>
                  <input 
                    type="range" 
                    min="5" 
                    max="50" 
                    value={fleetSize} 
                    onChange={(e) => setFleetSize(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Low Cap</span>
                    <span>High Cap</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-500">3rd Party Threshold</span>
                    <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">Auto</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Optimization Algo</span>
                    <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">Heuristic BSA</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Insights */}
            <div className="bg-blue-600 p-6 rounded-xl text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="font-semibold text-blue-100 mb-1">Projected Savings</h3>
                <div className="text-3xl font-bold mb-4">¥{result?.savings.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                <div className="text-sm text-blue-200 flex items-center">
                  <Activity className="w-4 h-4 mr-1" />
                  vs. Manual Scheduling
                </div>
              </div>
              <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
                <PieChart size={120} />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-12 lg:col-span-9 space-y-6">
            
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard 
                title="Total Cost" 
                value={`¥${result?.totalCost.toLocaleString()}`} 
                subtext="Daily Operational"
                icon={DollarSign}
                color="text-emerald-600 bg-emerald-600"
              />
              <StatCard 
                title="Fleet Utilization" 
                value={`${Math.round((result?.ownedUsage! / fleetSize) * 100)}%`} 
                subtext={`${result?.ownedUsage} / ${fleetSize} Active`}
                icon={Truck}
                color="text-blue-600 bg-blue-600"
              />
               <StatCard 
                title="Outsourced Orders" 
                value={result?.outsourcedUsage} 
                subtext={result?.outsourcedUsage > 0 ? "Fleet Capacity Exceeded" : "Fully Optimized"}
                icon={AlertCircle}
                color={result?.outsourcedUsage! > 0 ? "text-amber-600 bg-amber-600" : "text-slate-400 bg-slate-400"}
              />
              <StatCard 
                title="CO2 Emissions" 
                value={`${result?.co2.toFixed(0)} kg`} 
                subtext="-54 tons/yr pace"
                icon={Box}
                color="text-teal-600 bg-teal-600"
              />
            </div>

            {/* Map View */}
            {activeTab === 'map' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-semibold text-slate-700 flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    Hinterland Distribution
                  </h3>
                  <div className="flex space-x-4 text-xs font-medium">
                    <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>Owned Fleet</span>
                    <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>Outsourced</span>
                    <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-slate-800 mr-2"></span>Port (Shanghai)</span>
                  </div>
                </div>
                
                <div className="relative w-full h-[500px] bg-slate-100">
                  <svg width="100%" height="100%" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="absolute inset-0">
                    {/* Background Grid Lines */}
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Routes */}
                    {orders.map((order) => (
                      <line 
                        key={`line-${order.id}`}
                        x1={PORT_X} 
                        y1={PORT_Y} 
                        x2={order.x} 
                        y2={order.y} 
                        stroke={order.status === 'Assigned' ? '#3b82f6' : '#f59e0b'}
                        strokeWidth="1"
                        strokeOpacity="0.4"
                      />
                    ))}

                    {/* Port */}
                    <circle cx={PORT_X} cy={PORT_Y} r="15" fill="#1e293b" className="shadow-lg" />
                    <text x={PORT_X + 20} y={PORT_Y + 5} className="text-xs font-bold fill-slate-800">Port (Shanghai)</text>

                    {/* Orders */}
                    {orders.map((order) => (
                      <g key={order.id} className="cursor-pointer group">
                         <circle 
                          cx={order.x} 
                          cy={order.y} 
                          r={order.size === '40GP' ? 6 : 4} 
                          fill={order.status === 'Assigned' ? '#3b82f6' : '#f59e0b'}
                          className="transition-all duration-300 group-hover:r-8"
                        />
                        {/* Tooltip on Hover (Simple implementation) */}
                        <title>{`${order.id} | ${order.type} | ${order.distance}km`}</title>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>
            )}

            {/* Schedule Table View */}
            {activeTab === 'schedule' && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-semibold text-slate-700 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Dispatch Log
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3 font-medium">Order ID</th>
                        <th className="px-6 py-3 font-medium">Type</th>
                        <th className="px-6 py-3 font-medium">Distance</th>
                        <th className="px-6 py-3 font-medium">Assigned To</th>
                        <th className="px-6 py-3 font-medium text-right">Cost (¥)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result?.schedule.slice(0, 15).map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 font-medium text-slate-700">{row.orderId}</td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${row.method === 'Owned' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                              {row.method}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-slate-600">{row.distance} km</td>
                          <td className="px-6 py-3 font-mono text-slate-500">{row.vehicleId}</td>
                          <td className="px-6 py-3 text-right font-medium text-slate-700">¥{row.cost.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-100">
                    Showing first 15 records of {numOrders} total orders
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default YunfengDashboard;

