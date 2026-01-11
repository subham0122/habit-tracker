import { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = 'http://localhost:5000';

function HabitTracker() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [habits, setHabits] = useState([]);
  const [editingHabit, setEditingHabit] = useState(null);
  const [newHabitName, setNewHabitName] = useState('');
  const [startDate, setStartDate] = useState('2025-01-01');
  const [selectedMonth, setSelectedMonth] = useState('2025-01');
  const [selectedHabitId, setSelectedHabitId] = useState(null);

  // Restore session if user ID exists (optional, could be improved with tokens)
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setIsLoggedIn(true);
      fetchHabits(user.id);
    }
  }, []);

  const fetchHabits = async (userId) => {
    try {
      const res = await fetch(`${API_URL}/habits?userId=${userId}`);
      if (!res.ok) throw new Error('Failed to fetch habits');
      const data = await res.json();
      setHabits(data);
      if (data.length > 0 && !selectedHabitId) {
        setSelectedHabitId(data[0].id);
      }
    } catch (err) {
      console.error(err);
      // alert('Error fetching habits');
    }
  };

  const handleRegister = async () => {
    if (!registerName.trim() || !registerPassword.trim()) {
      setLoginError('Please enter both name and password');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: registerName, password: registerPassword }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Registration failed');
      }

      setLoginError('');
      setShowRegister(false);
      setRegisterName('');
      setRegisterPassword('');
      alert('Registration successful! Please login.');
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const handleLogin = async () => {
    if (!loginName.trim() || !loginPassword.trim()) {
      setLoginError('Please enter both name and password');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: loginName, password: loginPassword }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Login failed');
      }

      const user = await res.json();
      setCurrentUser(user);
      setIsLoggedIn(true);
      localStorage.setItem('user', JSON.stringify(user)); // Basic session persistence
      fetchHabits(user.id);

      setLoginError('');
      setLoginName('');
      setLoginPassword('');
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('user');
    setHabits([]);
    setLoginName('');
    setLoginPassword('');
  };

  const updateHabitName = async (habitId, newName) => {
    if (!newName.trim()) return;

    try {
      const res = await fetch(`${API_URL}/habits/${habitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newName })
      });
      if (!res.ok) throw new Error('Failed to update');

      setHabits(prev => prev.map(h => h.id === habitId ? { ...h, title: newName } : h));
      setEditingHabit(null);
      setNewHabitName('');
    } catch (err) {
      console.error(err);
      alert('Failed to update habit name');
    }
  };

  const addHabit = async () => {
    const habitName = prompt('Enter new habit name:');
    if (habitName && habitName.trim()) {
      try {
        const res = await fetch(`${API_URL}/habits`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, title: habitName.trim() }),
        });
        if (!res.ok) throw new Error('Failed to add habit');

        const newHabit = await res.json();
        // API returns just the habit row, so we need to add the empty completed_dates array
        setHabits(prev => [...prev, { ...newHabit, completed_dates: [] }]);
      } catch (err) {
        console.error(err);
        alert('Failed to add habit');
      }
    }
  };

  const deleteHabit = async (habitId) => {
    if (!confirm('Are you sure you want to delete this habit?')) return;

    try {
      const res = await fetch(`${API_URL}/habits/${habitId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');

      setHabits(prev => prev.filter(h => h.id !== habitId));
      if (selectedHabitId === habitId) {
        setSelectedHabitId(null);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete habit');
    }
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const generateMonthDates = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = getDaysInMonth(year, month);
    const dates = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      dates.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: day,
        fullDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      });
    }
    return dates;
  };

  const dates = generateMonthDates();

  const toggleHabit = async (habitId, dateKey) => {
    try {
      const res = await fetch(`${API_URL}/habits/${habitId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateKey }),
      });
      if (!res.ok) throw new Error('Failed to toggle');

      const { completed } = await res.json();

      setHabits(prev => prev.map(h => {
        if (h.id === habitId) {
          const newDates = completed
            ? [...h.completed_dates, dateKey]
            : h.completed_dates.filter(d => d !== dateKey);
          return { ...h, completed_dates: newDates };
        }
        return h;
      }));

    } catch (err) {
      console.error(err);
      alert('Failed to update habit log');
    }
  };

  const getHabitStats = (habit) => {
    if (!habit) return { checked: 0, total: 0, percentage: 0 };
    const relevantDates = dates.map(d => d.fullDate);
    const checked = habit.completed_dates.filter(d => relevantDates.includes(d)).length;
    const total = relevantDates.length;
    return { checked, total, percentage: total > 0 ? Math.round((checked / total) * 100) : 0 };
  };

  const getOverallStats = () => {
    const monthData = dates.map(d => d.fullDate);
    let perfectDays = 0;
    let halfDays = 0;
    let zeroDays = 0;

    monthData.forEach(date => {
      const completedCount = habits.filter(habit => habit.completed_dates.includes(date)).length;
      if (habits.length === 0) return;
      const percentage = (completedCount / habits.length) * 100;

      if (percentage === 100) perfectDays++;
      else if (percentage >= 50) halfDays++;
      else if (percentage === 0) zeroDays++;
    });

    return { perfectDays, halfDays, zeroDays };
  };

  const overallStats = getOverallStats();

  const barChartData = habits.map(habit => {
    const stats = getHabitStats(habit);
    return {
      name: habit.title.length > 20 ? habit.title.substring(0, 20) + '...' : habit.title,
      completed: stats.checked,
      remaining: stats.total - stats.checked
    };
  });

  const selectedHabit = habits.find(h => h.id === selectedHabitId) || habits[0];
  const selectedHabitStats = getHabitStats(selectedHabit);

  const pieChartData = selectedHabit ? [
    { name: 'Completed', value: selectedHabitStats.checked },
    { name: 'Remaining', value: selectedHabitStats.total - selectedHabitStats.checked }
  ] : [];

  const COLORS = ['#8b5cf6', '#ef4444'];

  // Login/Register Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Habit Tracker
          </h1>
          <p className="text-center text-gray-600 mb-6">Track your daily habits and achieve your goals</p>

          {!showRegister ? (
            // Login Form
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Login</h2>
              {loginError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">
                  {loginError}
                </div>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your name"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your password"
                />
              </div>
              <button
                onClick={handleLogin}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-md"
              >
                Login
              </button>
              <p className="text-center mt-4 text-gray-600">
                Don't have an account?{' '}
                <button
                  onClick={() => {
                    setShowRegister(true);
                    setLoginError('');
                  }}
                  className="text-purple-600 font-semibold hover:text-purple-700"
                >
                  Register
                </button>
              </p>
            </div>
          ) : (
            // Register Form
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Register</h2>
              {loginError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">
                  {loginError}
                </div>
              )}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Name (Unique)</label>
                <input
                  type="text"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Choose a unique name"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Create a password"
                />
              </div>
              <button
                onClick={handleRegister}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-md"
              >
                Register
              </button>
              <p className="text-center mt-4 text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setShowRegister(false);
                    setLoginError('');
                  }}
                  className="text-purple-600 font-semibold hover:text-purple-700"
                >
                  Login
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main Habit Tracker (only shown when logged in)
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-8xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
            <div>
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold text-gray-800">Habit Tracker</h1>
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {currentUser?.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  Logout
                </button>
              </div>
              <div className="mt-2 flex gap-4 flex-wrap">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date:
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Month:
                  </label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-lg mb-2 shadow-md">
                <div className="text-sm font-medium">100% Achieved Days</div>
                <div className="text-xl font-semibold">{overallStats.perfectDays} Days</div>
              </div>
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-lg mb-2 shadow-md">
                <div className="text-sm font-medium">50% Achieved Days</div>
                <div className="text-xl font-semibold">{overallStats.halfDays} Days</div>
              </div>
              <div className="bg-gradient-to-r from-rose-500 to-red-500 text-white px-4 py-2 rounded-lg shadow-md">
                <div className="text-sm font-medium">0% Lazy/Rest Days</div>
                <div className="text-xl font-semibold">{overallStats.zeroDays} Days</div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <button
              onClick={addHabit}
              className="bg-gradient-to-r from-violet-500 to-purple-500 text-white px-4 py-2 rounded-lg hover:from-violet-600 hover:to-purple-600 transition-all shadow-md font-medium"
            >
              + Add New Habit
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white border border-gray-200 p-3 text-left font-semibold sticky left-0 z-10">
                    Habit
                  </th>
                  {dates.map((d, i) => (
                    <th key={i} className={`p-2 text-center border border-gray-200 min-w-[60px] ${d.day === 'Mon' ? 'bg-blue-500 text-white' :
                      d.day === 'Tue' ? 'bg-indigo-500 text-white' :
                        d.day === 'Wed' ? 'bg-violet-500 text-white' :
                          d.day === 'Thu' ? 'bg-purple-500 text-white' :
                            d.day === 'Fri' ? 'bg-fuchsia-500 text-white' :
                              d.day === 'Sat' ? 'bg-pink-500 text-white' :
                                'bg-rose-500 text-white'
                      }`}>
                      <div className="text-xs font-medium">{d.day}</div>
                      <div className="text-lg font-semibold">{d.date}</div>
                    </th>
                  ))}
                  <th className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border border-gray-200 p-3 text-center">
                    Finished Days
                  </th>
                  <th className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border border-gray-200 p-3 text-center">
                    Consistency Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {habits.map((habit) => {
                  const stats = getHabitStats(habit);
                  return (
                    <tr key={habit.id} className="hover:bg-gray-50">
                      <td className="p-3 border border-gray-200 font-medium sticky left-0 bg-white z-10">
                        {editingHabit === habit.id ? (
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={newHabitName}
                              onChange={(e) => setNewHabitName(e.target.value)}
                              className="flex-1 p-1 border border-gray-300 rounded"
                              autoFocus
                            />
                            <button
                              onClick={() => updateHabitName(habit.id, newHabitName)}
                              className="text-green-600 hover:text-green-700 font-bold"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => {
                                setEditingHabit(null);
                                setNewHabitName('');
                              }}
                              className="text-red-600 hover:text-red-700 font-bold"
                            >
                              ✗
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center gap-2">
                            <span>{habit.title}</span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  setEditingHabit(habit.id);
                                  setNewHabitName(habit.title);
                                }}
                                className="text-blue-600 hover:text-blue-700 text-sm px-2"
                                title="Edit habit"
                              >
                                ✎
                              </button>
                              <button
                                onClick={() => deleteHabit(habit.id)}
                                className="text-red-600 hover:text-red-700 text-sm px-2"
                                title="Delete habit"
                              >
                                🗑
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                      {dates.map((d, dateIndex) => (
                        <td key={dateIndex} className="p-2 border border-gray-200 text-center">
                          <input
                            type="checkbox"
                            checked={habit.completed_dates.includes(d.fullDate)}
                            onChange={() => toggleHabit(habit.id, d.fullDate)}
                            className="w-5 h-5 cursor-pointer accent-violet-500"
                          />
                        </td>
                      ))}
                      <td className="p-3 border border-gray-200 text-center font-semibold text-lg text-blue-600">
                        {stats.checked}
                      </td>
                      <td className="p-3 border border-gray-200 text-center font-semibold text-lg text-emerald-600">
                        {stats.percentage}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Overall Habit Completion</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} fontSize={12} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#8b5cf6" name="Completed" />
                <Bar dataKey="remaining" fill="#ec4899" name="Remaining" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Selected Habit Progress</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Habit:
              </label>
              <select
                value={selectedHabit?.id || ''}
                onChange={(e) => setSelectedHabitId(Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {habits.map(habit => (
                  <option key={habit.id} value={habit.id}>{habit.title}</option>
                ))}
              </select>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center">
              <p className="text-lg font-semibold text-gray-700">
                Completion: {selectedHabitStats.checked} / {selectedHabitStats.total} days
              </p>
              <p className="text-2xl font-semibold text-violet-600">
                {selectedHabitStats.percentage}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HabitTracker;