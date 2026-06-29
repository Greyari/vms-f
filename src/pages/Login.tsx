import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/login', credentials);
            login(res.data.access_token, res.data.user);
            navigate('/visits/activate');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed. Check credentials/API URL.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
            <div className="w-full max-w-sm space-y-8 rounded-xl bg-white p-8 shadow-sm border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">VMS Portal</h2>
                    <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Sign in to active visitor directory</p>
                </div>
                
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="rounded-md bg-red-50 p-3 text-sm text-red-500 font-semibold border border-red-200">
                            {error}
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none text-zinc-700 dark:text-zinc-300">Email Address</label>
                            <input
                                name="email"
                                type="email"
                                required
                                value={credentials.email}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:focus:ring-zinc-300"
                                placeholder="name@company.com"
                            />
                        </div>
                        <div className="space-y-2">
                             <label className="text-sm font-medium leading-none text-zinc-700 dark:text-zinc-300">Password</label>
                            <input
                                name="password"
                                type="password"
                                required
                                value={credentials.password}
                                onChange={handleChange}
                                className="flex h-10 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:focus:ring-zinc-300"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative flex w-full justify-center rounded-md border border-transparent bg-zinc-900 py-2 px-4 text-sm font-medium text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                        {loading ? 'Authenticating...' : 'Sign In'}
                    </button>
                    
                    <p className="text-center text-xs text-zinc-500 mt-4">
                        (Security Default: security@vms.local / password123)
                        <br/>
                        (Admin Default: admin@vms.local / password123)
                    </p>
                </form>
            </div>
        </div>
    );
}
