import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import { Users, ClipboardList, CreditCard, Car, ShieldOff, UserCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Dashboard() {
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await api.get('/dashboard');
                setData(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetch();

        // Auto refresh setiap 30 detik
        const interval = setInterval(fetch, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900" />
        </div>
    );

    const statCards = [
        { label: 'Active Visitors', value: data.stats.active_visits, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30', onClick: () => navigate('/visits/activate') },
        { label: 'This Month', value: data.stats.month_visits, icon: ClipboardList, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30', onClick: () => navigate('/visits/report') },
        { label: 'Total Visitors', value: data.stats.total_visitors, icon: Users, color: 'text-zinc-600', bg: 'bg-zinc-50 dark:bg-zinc-900', onClick: () => navigate('/master/visitors') },
        { label: 'Blacklisted', value: data.stats.blacklisted_visitors, icon: ShieldOff, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30', onClick: () => navigate('/master/visitors/blacklist') },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {statCards.map((card, i) => (
                    <div
                        key={i}
                        onClick={card.onClick}
                        className={`${card.bg} border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow`}
                    >
                        <div className={`${card.color} mb-2`}>
                            <card.icon className="h-5 w-5" />
                        </div>
                        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{card.value}</p>
                        <p className="text-xs text-zinc-500 mt-1">{card.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                    <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Visits Last 7 Days</h2>
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={data.chart}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="total" fill="#18181b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Cards Status */}
                <div className="space-y-4">
                    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <CreditCard className="h-4 w-4 text-zinc-500" />
                            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Visitor Cards</h2>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Available</span>
                                <span className="font-medium text-green-600">{data.cards.available}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">In Use</span>
                                <span className="font-medium text-orange-600">{data.cards.in_use}</span>
                            </div>
                            <div className="flex justify-between text-sm border-t pt-2">
                                <span className="text-zinc-500">Total</span>
                                <span className="font-medium">{data.cards.total}</span>
                            </div>
                            <div className="w-full bg-zinc-100 rounded-full h-2 mt-2">
                                <div
                                    className="bg-orange-500 h-2 rounded-full transition-all"
                                    style={{ width: `${data.cards.total > 0 ? (data.cards.in_use / data.cards.total) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Car className="h-4 w-4 text-zinc-500" />
                            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Vehicle Cards</h2>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Available</span>
                                <span className="font-medium text-green-600">{data.vehicle_cards.available}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">In Use</span>
                                <span className="font-medium text-orange-600">{data.vehicle_cards.in_use}</span>
                            </div>
                            <div className="flex justify-between text-sm border-t pt-2">
                                <span className="text-zinc-500">Total</span>
                                <span className="font-medium">{data.vehicle_cards.total}</span>
                            </div>
                            <div className="w-full bg-zinc-100 rounded-full h-2 mt-2">
                                <div
                                    className="bg-orange-500 h-2 rounded-full transition-all"
                                    style={{ width: `${data.vehicle_cards.total > 0 ? (data.vehicle_cards.in_use / data.vehicle_cards.total) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Active Visits */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">Currently Active Visitors</h2>
                {data.recent_visits.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-4">No active visitors</p>
                ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {data.recent_visits.map((visit: any) => (
                            <div key={visit.id} className="flex items-center justify-between py-3">
                                <div>
                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{visit.visitor_name}</p>
                                    <p className="text-xs text-zinc-500">{visit.purpose} — {visit.staff_name}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-mono text-zinc-400">{visit.time_in}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}