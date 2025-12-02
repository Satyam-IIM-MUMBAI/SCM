import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  MapPin, 
  DollarSign, 
  Clock, 
  Settings, 
  Activity, 
  PieChart, 
  Box, 
  AlertCircle 
} from 'lucide-react';

// --- Constants from Zhen et al. (2021) ---
const COST_OWNED_FIXED = 300;       // Yuan
const COST_OWNED_PER_KM = 13.5;     // Yuan/km
const COST_3RD_PARTY_FIXED = 2000;  // Yuan
const COST_3RD_PARTY_PER_KM = 14.0; // Yuan/km
const CO2_PER_KM = 0.27;            // kg/km

// Map Constants for Visualization
const MAP_WIDTH = 800;
const MAP_HEIGHT = 400;
const PORT_X = MAP_WIDTH * 0.85;
const PORT_Y = MAP_HEIGHT * 0.5;

const YunfengDashboard = () => {
  // --- State ---
  const [numOrders, setNumOrders] = useState(84);
  const [fleetSize, setFleetSize] = useState(30);
  const [orders, setOrders] = useState([]);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('map');

  // --- Simulation Logic ---
  const runSimulation = () => {
    // 1. Generate Mock Orders
    const newOrders = Array.from({ length: numOrders }).map((_, i) => {
      // Generate random position clustered towards the left (hinterland)
      const x = Math.random() * (MAP_WIDTH * 0.7) + 40; 
      const y = Math.random() * (MAP_HEIGHT - 60) + 30;
      
      // Calc Euclidean distance scaled to km (approx)
      const distPx = Math.sqrt(Math.pow(x - PORT_X, 2) + Math.pow(y - PORT_Y, 2));
      const distKm = Math.floor(distPx * 0.4) + 40; // Scale factor

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
    // This mimics the logic of prioritizing urgent/distant orders
    const sortedOrders = [...newOrders].sort((a, b) => {
      if (a.urgency === 'Urgent' && b.urgency !== 'Urgent') return -1;
      if (a.urgency !== 'Urgent' && b.urgency === 'Urgent') return 1;
      return b.distance - a.distance; 
    });

    // 3. Allocate Vehicles
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
        // Outsource to 3rd Party
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

    // 4. Calculate Financial Metrics
    // Paper states ~13.28% cost reduction vs manual. 
    // We assume the simulation result is the "Optimized" version.
    // Manual Cost ~= Optimized / (1 - 0.1328)
    const manualEst = currentCost * 1.153; 
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

  // Run simulation whenever sliders change
  useEffect(() => {
    runSimulation();
  }, [numOrders, fleetSize]);

  // --- Helper Components ---
  const StatCard = ({ title, value, subtext, icon: Icon, color }) => (
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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-600/20">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Yunfeng Logistics DSS</h1>
            <p className="text-sm text-slate-500 font-medium">Intelligent Scheduling System • Zhen et al. (2021)</p>
          </div>
        </div>
        
        <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
          <button 
            onClick={() => setActiveTab('map')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'map' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Overview & Map
          </button>
          <button 
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'schedule' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Schedule Details
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-12 gap-8">
        
        {/* Left Column: Controls */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-slate-400" />
              Configuration
            </h2>
            
            <div className="space-y-8">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-700">Daily Orders</label>
                  <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{numOrders}</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="150" 
                  value={numOrders} 
                  onChange={(e) => setNumOrders(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-2">
                  <span>Low Vol</span>
                  <span>High Vol</span>
                </div>
              </div>

              <div>
                 <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-700">Fleet Size</label>
                  <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{fleetSize}</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="50" 
                  value={fleetSize} 
                  onChange={(e) => setFleetSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-2">
                  <span>Small Fleet</span>
                  <span>Large Fleet</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-100">
               <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span>Algorithm</span>
                  <span className="font-mono bg-slate-100 px-2 py-1 rounded">Heuristic BSA</span>
               </div>
               <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Validation</span>
                  <span className="font-mono bg-slate-100 px-2 py-1 rounded">Appendix A</span>
               </div>
            </div>
          </div>

          {/* Savings Card */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-xl shadow-blue-900/20 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-medium text-blue-100 text-sm mb-1 uppercase tracking-wider">Estimated Savings</h3>
              <div className="text-4xl font-bold mb-4">¥{result?.savings.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
              <div className="flex items-center text-sm text-blue-200 bg-white/10 w-fit px-3 py-1 rounded-full">
                <Activity className="w-4 h-4 mr-2" />
                vs. Manual Process
              </div>
            </div>
            {/* Decorator */}
            <div className="absolute -right-6 -bottom-6 text-white/10">
              <PieChart size={140} />
            </div>
          </div>
        </div>

        {/* Right Column: Visualization & Stats */}
        <div className="col-span-12 lg:col-span-9 space-y-6">
          
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Total Cost" 
              value={`¥${result?.totalCost.toLocaleString()}`} 
              subtext="Daily Optimization"
              icon={DollarSign}
              color="text-emerald-600 bg-emerald-600"
            />
            <StatCard 
              title="Fleet Usage" 
              value={`${Math.round((result?.ownedUsage / fleetSize) * 100)}%`} 
              subtext={`${result?.ownedUsage} / ${fleetSize} Vehicles`}
              icon={Truck}
              color="text-blue-600 bg-blue-600"
            />
            <StatCard 
              title="Outsourced" 
              value={result?.outsourcedUsage} 
              subtext={result?.outsourcedUsage > 0 ? "Capacity Exceeded" : "Optimal Internal"}
              icon={AlertCircle}
              color={result?.outsourcedUsage > 0 ? "text-amber-600 bg-amber-600" : "text-slate-400 bg-slate-400"}
            />
            <StatCard 
              title="CO2 Impact" 
              value={`${result?.co2.toFixed(0)} kg`} 
              subtext="-54 tons/yr pace"
              icon={Box}
              color="text-teal-600 bg-teal-600"
            />
          </div>

          {/* Map Visualization */}
          {activeTab === 'map' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                  Live Route Simulation
                </h3>
                <div className="flex gap-4 text-xs font-medium">
                  <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>Owned Fleet</div>
                  <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>Outsourced</div>
                  <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-slate-800 mr-2"></span>Port</div>
                </div>
              </div>
              
              <div className="relative flex-grow bg-slate-100">
                <svg width="100%" height="100%" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="absolute inset-0 w-full h-full">
                  {/* Grid Pattern */}
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#cbd5e1" strokeWidth="0.5" strokeOpacity="0.5" />
                    </pattern>
                    <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                      <polygon points="0 0, 6 2, 0 4" fill="#94a3b8" />
                    </marker>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />

                  {/* Connection Lines */}
                  {orders.map((order) => (
                    <line 
                      key={`line-${order.id}`}
                      x1={PORT_X} 
                      y1={PORT_Y} 
                      x2={order.x} 
                      y2={order.y} 
                      stroke={order.status === 'Assigned' ? '#3b82f6' : '#f59e0b'}
                      strokeWidth={order.size === '40GP' ? 2 : 1}
                      strokeOpacity="0.3"
                    />
                  ))}

                  {/* Port Node */}
                  <g>
                    <circle cx={PORT_X} cy={PORT_Y} r="20" fill="#1e293b" className="shadow-xl" />
                    <circle cx={PORT_X} cy={PORT_Y} r="20" fill="none" stroke="white" strokeWidth="2" strokeDasharray="4 2" className="animate-spin-slow origin-center" />
                    <text x={PORT_X} y={PORT_Y + 35} textAnchor="middle" className="text-xs font-bold fill-slate-700 uppercase tracking-widest">Port of Shanghai</text>
                  </g>

                  {/* Order Nodes */}
                  {orders.map((order) => (
                    <g key={order.id} className="cursor-pointer group hover:z-50">
                       <circle 
                        cx={order.x} 
                        cy={order.y} 
                        r={order.size === '40GP' ? 6 : 4} 
                        fill={order.status === 'Assigned' ? '#3b82f6' : '#f59e0b'}
                        className="transition-all duration-300 group-hover:r-8 stroke-white stroke-2 shadow-sm"
                      />
                      {/* Tooltip */}
                      <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <rect x={order.x + 10} y={order.y - 30} width="140" height="60" rx="4" fill="white" className="shadow-lg" />
                        <text x={order.x + 20} y={order.y - 15} className="text-xs font-bold fill-slate-800">{order.id}</text>
                        <text x={order.x + 20} y={order.y} className="text-[10px] fill-slate-500">{order.type} • {order.size}</text>
                        <text x={order.x + 20} y={order.y + 15} className="text-[10px] fill-slate-500 font-mono">Dist: {order.distance}km</text>
                      </g>
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          )}

          {/* Schedule View */}
          {activeTab === 'schedule' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-slate-400" />
                  Dispatch Logs
                </h3>
                <button className="text-xs text-blue-600 font-medium hover:underline">Export CSV</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Order ID</th>
                      <th className="px-6 py-4 font-semibold">Fulfillment Method</th>
                      <th className="px-6 py-4 font-semibold">Distance</th>
                      <th className="px-6 py-4 font-semibold">Assigned Vehicle</th>
                      <th className="px-6 py-4 font-semibold text-right">Cost (¥)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result?.schedule.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-700">{row.orderId}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${row.method === 'Owned' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                            {row.method}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{row.distance} km</td>
                        <td className="px-6 py-4 font-mono text-slate-500 text-xs">{row.vehicleId}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-700">¥{row.cost.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-4 text-center text-xs text-slate-400 border-t border-slate-100 bg-slate-50">
                  Displaying top 10 most recent allocations
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default YunfengDashboard;

