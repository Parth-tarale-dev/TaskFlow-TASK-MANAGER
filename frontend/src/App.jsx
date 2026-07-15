import React, { useState, useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Check, 
  Plus, 
  Trash2, 
  Flame, 
  Activity, 
  Sparkles, 
  Grid, 
  TrendingUp, 
  RotateCcw,
  CheckSquare
} from 'lucide-react';
import { initialData } from './mockData';

export default function App() {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState('All');
  const [newHabitModal, setNewHabitModal] = useState(false);
  
  // Form states for creating a new habit
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitEmoji, setNewHabitEmoji] = useState('✨');
  const [newHabitCategory, setNewHabitCategory] = useState('Routine');

  const activeMonth = data.activeMonth; // "2026-07"
  
  // Calculate total days in July (31 days)
  const totalDays = 31;
  const days = useMemo(() => {
    return Array.from({ length: totalDays }, (_, i) => {
      const d = i + 1;
      return d.toString().padStart(2, '0');
    });
  }, [totalDays]);

  // Today is fixed at "15" based on the current context (2026-07-15)
  const todayDay = "15";

  // Check if a day is today
  const isToday = (dayStr) => dayStr === todayDay;

  // Toggle habit check state
  const toggleDay = (habitId, dateKey) => {
    setData(prev => {
      const updatedHabits = prev.habits.map(habit => {
        if (habit.id === habitId) {
          const currentHistory = { ...habit.history };
          if (currentHistory[dateKey]) {
            delete currentHistory[dateKey];
          } else {
            currentHistory[dateKey] = true;
          }
          return { ...habit, history: currentHistory };
        }
        return habit;
      });
      return { ...prev, habits: updatedHabits };
    });
  };

  // Add new habit
  const addHabit = (e) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const newHabit = {
      id: `habit_${Date.now()}`,
      name: newHabitName,
      emoji: newHabitEmoji || '✨',
      category: newHabitCategory,
      history: {}
    };

    setData(prev => ({
      ...prev,
      habits: [...prev.habits, newHabit]
    }));

    // Reset form
    setNewHabitName('');
    setNewHabitEmoji('✨');
    setNewHabitCategory('Routine');
    setNewHabitModal(false);
  };

  // Delete a habit
  const deleteHabit = (habitId) => {
    if (confirm("Are you sure you want to delete this routine?")) {
      setData(prev => ({
        ...prev,
        habits: prev.habits.filter(h => h.id !== habitId)
      }));
    }
  };

  // Reset all stats/history
  const resetAllData = () => {
    if (confirm("WARNING: This will wipe out all completion checkmarks for this month. Reset?")) {
      setData(prev => ({
        ...prev,
        habits: prev.habits.map(h => ({ ...h, history: {} }))
      }));
    }
  };

  // Get distinct categories
  const categories = useMemo(() => {
    const cats = new Set(data.habits.map(h => h.category));
    return ['All', ...Array.from(cats)];
  }, [data.habits]);

  // Filtered habits
  const filteredHabits = useMemo(() => {
    if (activeTab === 'All') return data.habits;
    return data.habits.filter(h => h.category === activeTab);
  }, [data.habits, activeTab]);

  // Helper for category styling tag
  const getCategoryStyle = (category) => {
    switch (category) {
      case 'Routine':
        return 'text-cyan-400 border-cyan-800 bg-cyan-950/20';
      case 'Health':
        return 'text-green-400 border-green-800 bg-green-950/20';
      case 'Productivity':
        return 'text-pink-400 border-pink-800 bg-pink-950/20';
      case 'Learning':
        return 'text-yellow-400 border-yellow-800 bg-yellow-950/20';
      case 'Mental Health':
        return 'text-purple-400 border-purple-800 bg-purple-950/20';
      default:
        return 'text-gray-400 border-gray-800 bg-gray-900/20';
    }
  };

  // 1. Calculations for the Top Analytics Area Chart
  const chartData = useMemo(() => {
    return days.map(d => {
      const dateKey = `${activeMonth}-${d}`;
      const totalHabitsCount = data.habits.length;
      
      let completedCount = 0;
      data.habits.forEach(habit => {
        if (habit.history[dateKey]) {
          completedCount++;
        }
      });

      const percentage = totalHabitsCount > 0 
        ? Math.round((completedCount / totalHabitsCount) * 100) 
        : 0;

      return {
        day: d,
        dateLabel: `Day ${d}`,
        percentage,
        completedCount,
        total: totalHabitsCount
      };
    });
  }, [days, data.habits, activeMonth]);

  // 2. Calculations for the Leaderboard Panel (Top habits ranked by completion rate)
  const leaderboardData = useMemo(() => {
    // For each habit, calculate the percentage of checked days out of total days (31)
    const ranked = data.habits.map(habit => {
      const completedDaysCount = Object.keys(habit.history).filter(key => 
        key.startsWith(activeMonth) && habit.history[key] === true
      ).length;

      const completionRate = Math.round((completedDaysCount / totalDays) * 100);

      return {
        ...habit,
        completedDaysCount,
        completionRate
      };
    });

    // Sort descending by completionRate
    return [...ranked].sort((a, b) => b.completionRate - a.completionRate);
  }, [data.habits, activeMonth, totalDays]);

  // Summary Metrics
  const globalCompletionRate = useMemo(() => {
    if (data.habits.length === 0) return 0;
    
    let totalChecks = 0;
    const maxPossibleChecks = data.habits.length * totalDays;

    data.habits.forEach(habit => {
      const count = Object.keys(habit.history).filter(key => 
        key.startsWith(activeMonth) && habit.history[key] === true
      ).length;
      totalChecks += count;
    });

    return maxPossibleChecks > 0 ? Math.round((totalChecks / maxPossibleChecks) * 100) : 0;
  }, [data.habits, activeMonth, totalDays]);

  // Calculate current streak for the "Best Performing Habit"
  const topStreak = useMemo(() => {
    if (data.habits.length === 0) return { habit: 'None', streak: 0 };
    
    let maxStreak = 0;
    let maxStreakHabit = 'None';

    data.habits.forEach(habit => {
      let currentStreak = 0;
      let tempStreak = 0;
      // Loop backwards from today (15) to day 1 to calculate current consecutive checked days
      for (let d = parseInt(todayDay); d >= 1; d--) {
        const dateKey = `${activeMonth}-${d.toString().padStart(2, '0')}`;
        if (habit.history[dateKey]) {
          tempStreak++;
        } else {
          break; // streak broken
        }
      }
      if (tempStreak > maxStreak) {
        maxStreak = tempStreak;
        maxStreakHabit = `${habit.emoji} ${habit.name}`;
      }
    });

    return { habit: maxStreakHabit, streak: maxStreak };
  }, [data.habits, activeMonth, todayDay]);

  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col font-mono p-4 md:p-6 relative select-none">
      {/* Background visual detail */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-60"></div>
      
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800 pb-4 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-cyan-400 animate-pulse"><Grid size={24} className="stroke-[2.5]" /></span>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-widest uppercase">
              Routine<span className="text-cyan-400 neon-text-cyan">Kraft</span>
            </h1>
            <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded font-bold">
              DESKTOP v1.0.0
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
            High-density biometric & productivity tracking grid // Month: {activeMonth}
          </p>
        </div>

        {/* Global Action buttons */}
        <div className="flex space-x-2 mt-4 md:mt-0">
          <button 
            onClick={() => setNewHabitModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-950/40 hover:bg-cyan-500 hover:text-black border border-cyan-800 hover:border-cyan-400 text-cyan-400 text-xs font-bold uppercase transition-all duration-200 shadow-sm hover:shadow-neon-cyan"
          >
            <Plus size={14} className="stroke-[3]" />
            <span>Add Routine</span>
          </button>
          
          <button 
            onClick={resetAllData}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-900/40 hover:bg-pink-600 hover:text-white border border-gray-800 hover:border-pink-500 text-pink-400 text-xs font-bold uppercase transition-all duration-200"
            title="Reset Monthly Grid"
          >
            <RotateCcw size={14} />
            <span>Reset Grid</span>
          </button>
        </div>
      </header>

      {/* METRIC OVERVIEW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#08080a] border border-gray-800 p-3 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 rounded-full blur-xl"></div>
          <div>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">Global Completion Rate</span>
            <div className="text-3xl font-black text-cyan-400 neon-text-cyan mt-1">{globalCompletionRate}%</div>
          </div>
          <div className="p-2 bg-cyan-950/30 rounded border border-cyan-900 text-cyan-400">
            <CheckSquare size={20} />
          </div>
        </div>

        <div className="bg-[#08080a] border border-gray-800 p-3 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-pink-500/5 rounded-full blur-xl"></div>
          <div>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">Top Daily Streak</span>
            <div className="text-lg font-bold text-pink-500 neon-text-pink mt-1 truncate max-w-[200px]">
              {topStreak.streak > 0 ? `${topStreak.streak} Days` : '0 Days'}
            </div>
            <p className="text-[9px] text-gray-600 mt-0.5 truncate max-w-[200px]">{topStreak.habit}</p>
          </div>
          <div className="p-2 bg-pink-950/30 rounded border border-pink-900 text-pink-400">
            <Flame size={20} />
          </div>
        </div>

        <div className="bg-[#08080a] border border-gray-800 p-3 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/5 rounded-full blur-xl"></div>
          <div>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest">Tracking Efficiency</span>
            <div className="text-3xl font-black text-green-400 neon-text-green mt-1">
              {data.habits.length > 0 ? `${Math.round((leaderboardData.filter(h => h.completionRate > 0).length / data.habits.length) * 100)}%` : '0%'}
            </div>
          </div>
          <div className="p-2 bg-green-950/30 rounded border border-green-900 text-green-400">
            <Activity size={20} />
          </div>
        </div>
      </div>

      {/* ANALYTICS HEADER PANEL (Top Line/Area Chart) */}
      <div className="bg-[#08080a] border border-gray-800 p-4 mb-6 relative">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-cyan-400"><TrendingUp size={16} /></span>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">
              30-Day Completion Vector
            </h2>
          </div>
          <span className="text-[9px] font-mono text-gray-600">X: Days of Month // Y: Completion Rate %</span>
        </div>
        
        <div className="h-40 md:h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="cyanGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#121214" strokeDasharray="3 3" />
              <XAxis 
                dataKey="day" 
                stroke="#4b5563" 
                tick={{ fontSize: 9, fontFamily: 'monospace' }}
              />
              <YAxis 
                stroke="#4b5563" 
                tick={{ fontSize: 9, fontFamily: 'monospace' }}
                domain={[0, 100]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const dataObj = payload[0].payload;
                    return (
                      <div className="bg-black border border-cyan-800 p-2 text-xs font-mono glow-cyan">
                        <p className="text-cyan-400 font-bold">2026-07-{dataObj.day}</p>
                        <p className="text-gray-300 mt-1">Rate: <span className="text-white font-bold">{dataObj.percentage}%</span></p>
                        <p className="text-gray-500 text-[10px]">({dataObj.completedCount}/{dataObj.total} completed)</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="percentage" 
                stroke="#00f0ff" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#cyanGlow)" 
                activeDot={{ r: 4, stroke: '#00f0ff', strokeWidth: 1, fill: '#050506' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* LOWER DIVISION: GRID (Left/Center) & LEADERBOARD (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start flex-grow">
        
        {/* GRID SPREADSHEET PANEL */}
        <div className="lg:col-span-3 bg-[#08080a] border border-gray-800 p-4 overflow-hidden flex flex-col h-full">
          
          {/* Filters & Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 mb-4 gap-2 border-b border-gray-900">
            <div className="flex items-center space-x-2">
              <span className="text-gray-400"><CheckSquare size={16} /></span>
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-300">
                Habit Database Grid
              </h2>
            </div>
            
            {/* Category tabs */}
            <div className="flex flex-wrap gap-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 border transition-all ${
                    activeTab === cat
                      ? 'bg-cyan-950 text-cyan-400 border-cyan-400'
                      : 'bg-black text-gray-500 border-gray-800 hover:text-gray-300 hover:border-gray-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* DENSE SPREADSHEET SCROLL CONTAINER */}
          <div className="overflow-x-auto w-full border border-gray-900 bg-black relative max-h-[420px] rounded-sm">
            <table className="w-full border-collapse text-left select-none table-fixed">
              <thead>
                {/* Row 1: Week Span Headers */}
                <tr className="border-b border-gray-900 bg-[#0c0c0f]">
                  <th className="w-60 sticky left-0 bg-[#0c0c0f] z-30 p-2 text-xs font-bold text-gray-500 border-r border-gray-900">
                    ROUTINE MATRIX
                  </th>
                  <th colSpan={7} className="text-center text-[10px] font-bold text-cyan-400 border-r border-gray-900 py-1 bg-cyan-950/5 font-mono">
                    WEEK 1 (01-07)
                  </th>
                  <th colSpan={7} className="text-center text-[10px] font-bold text-pink-400 border-r border-gray-900 py-1 bg-pink-950/5 font-mono">
                    WEEK 2 (08-14)
                  </th>
                  <th colSpan={7} className="text-center text-[10px] font-bold text-green-400 border-r border-gray-900 py-1 bg-green-950/5 font-mono">
                    WEEK 3 (15-21)
                  </th>
                  <th colSpan={7} className="text-center text-[10px] font-bold text-yellow-400 border-r border-gray-900 py-1 bg-yellow-950/5 font-mono">
                    WEEK 4 (22-28)
                  </th>
                  <th colSpan={3} className="text-center text-[10px] font-bold text-purple-400 py-1 bg-purple-950/5 font-mono">
                    W5 (29-31)
                  </th>
                </tr>
                {/* Row 2: Individual Day Columns */}
                <tr className="border-b border-gray-900 bg-[#09090c] text-center">
                  <th className="w-60 sticky left-0 bg-[#09090c] z-30 p-2 text-left text-[10px] text-gray-600 border-r border-gray-900 font-mono">
                    NAME & CATEGORY
                  </th>
                  {days.map(d => (
                    <th 
                      key={d} 
                      className={`w-10 p-1.5 border-r border-gray-900 text-center text-xs font-bold font-mono transition-colors ${
                        isToday(d) 
                          ? 'bg-cyan-950/20 text-cyan-400 border-b border-b-cyan-500' 
                          : 'text-gray-400'
                      }`}
                    >
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredHabits.length === 0 ? (
                  <tr>
                    <td colSpan={32} className="text-center py-10 text-xs text-gray-500 uppercase tracking-widest font-mono">
                      No routines registered in this vector.
                    </td>
                  </tr>
                ) : (
                  filteredHabits.map((habit) => (
                    <tr 
                      key={habit.id} 
                      className="border-b border-gray-900 hover:bg-gray-900/10 group transition-colors"
                    >
                      {/* Sticky Habit Info Column */}
                      <td className="w-60 sticky left-0 bg-[#050506] z-20 p-2 border-r border-gray-900 flex items-center justify-between group-hover:bg-[#0c0c0e]">
                        <div className="flex items-center space-x-2 truncate pr-1">
                          <span className="text-base select-none">{habit.emoji}</span>
                          <span className="text-[12px] font-bold text-gray-200 truncate" title={habit.name}>
                            {habit.name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <span className={`text-[8px] px-1 py-0.5 rounded-sm border shrink-0 ${getCategoryStyle(habit.category)}`}>
                            {habit.category.slice(0, 5)}
                          </span>
                          <button
                            onClick={() => deleteHabit(habit.id)}
                            className="text-gray-700 hover:text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150 py-0.5"
                            title="Delete Routine"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </td>
                      
                      {/* Checkbox Grid Cells */}
                      {days.map(d => {
                        const dateKey = `${activeMonth}-${d}`;
                        const completed = !!habit.history[dateKey];
                        const dayVal = parseInt(d);
                        
                        // Disable ticking future dates (July 16th and beyond) to keep tracking authentic
                        const isFuture = dayVal > parseInt(todayDay);

                        return (
                          <td 
                            key={d} 
                            className={`p-1.5 border-r border-gray-900 text-center transition-colors ${
                              isToday(d) 
                                ? 'bg-cyan-950/5' 
                                : completed 
                                  ? 'bg-[#00f0ff]/[0.01]' 
                                  : ''
                            }`}
                          >
                            <button
                              disabled={isFuture}
                              onClick={() => toggleDay(habit.id, dateKey)}
                              className={`w-5 h-5 mx-auto rounded-sm border flex items-center justify-center transition-all duration-150 ${
                                isFuture
                                  ? 'bg-black border-gray-900 opacity-20 cursor-not-allowed'
                                  : completed
                                    ? 'bg-cyan-500 border-cyan-400 text-black shadow-neon-cyan'
                                    : 'bg-black border-gray-800 hover:border-cyan-400 shadow-inner'
                              }`}
                              title={isFuture ? `Date 2026-07-${d} is locked` : `Toggle 2026-07-${d}`}
                            >
                              {completed && <Check size={11} className="stroke-[3]" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center text-[9px] text-gray-600 mt-3 font-mono">
            <span>[SCROLL HORIZONTALLY TO ACCESS LATER WEEKS]</span>
            <span>CELL COUNT: {filteredHabits.length * totalDays} NODES</span>
          </div>
        </div>

        {/* SIDE LEADERBOARD PANEL */}
        <div className="bg-[#08080a] border border-gray-800 p-4 h-full flex flex-col">
          <div className="flex items-center space-x-2 pb-3 border-b border-gray-900 mb-4">
            <span className="text-pink-500 animate-pulse"><Sparkles size={16} /></span>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-300">
              Top Daily Habits
            </h2>
          </div>

          {/* Ranks */}
          <div className="space-y-3.5 flex-grow overflow-y-auto pr-1 max-h-[360px]">
            {leaderboardData.length === 0 ? (
              <p className="text-center text-xs text-gray-600 uppercase py-6">
                No leaderboard nodes.
              </p>
            ) : (
              leaderboardData.slice(0, 10).map((habit, index) => {
                const rankColors = [
                  'text-cyan-400 font-bold border-cyan-800 bg-cyan-950/20', // Rank 1
                  'text-pink-400 font-bold border-pink-800 bg-pink-950/20', // Rank 2
                  'text-green-400 font-bold border-green-800 bg-green-950/20', // Rank 3
                ];
                
                const standardRank = 'text-gray-500 border-gray-800 bg-gray-900/40';

                return (
                  <div key={habit.id} className="group relative">
                    <div className="flex justify-between items-start text-xs mb-1 font-mono">
                      <div className="flex items-center space-x-2 truncate">
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-sm border shrink-0 ${index < 3 ? rankColors[index] : standardRank}`}>
                          #{index + 1}
                        </span>
                        <span className="text-gray-400 select-none">{habit.emoji}</span>
                        <span className="text-gray-200 font-bold truncate max-w-[130px] group-hover:text-cyan-400 transition-colors">
                          {habit.name}
                        </span>
                      </div>
                      <span className="font-bold text-cyan-400 font-mono shrink-0 select-all">
                        {habit.completionRate}%
                      </span>
                    </div>
                    
                    {/* Tiny Progress bar background */}
                    <div className="w-full h-1 bg-[#101015] rounded-full overflow-hidden border border-gray-900">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          habit.completionRate >= 80 
                            ? 'bg-green-500 shadow-neon-green' 
                            : habit.completionRate >= 50 
                              ? 'bg-cyan-400 shadow-neon-cyan' 
                              : 'bg-pink-500 shadow-neon-pink'
                        }`}
                        style={{ width: `${habit.completionRate}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[8px] text-gray-600 mt-0.5">
                      <span>{habit.category}</span>
                      <span>{habit.completedDaysCount}/31 days completed</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* NEW HABIT OVERLAY MODAL */}
      {newHabitModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0c0e] border border-cyan-800 w-full max-w-sm p-5 glow-cyan relative">
            
            {/* Corner styling details */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400"></div>

            <div className="flex justify-between items-center pb-3 border-b border-gray-800 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-1.5">
                <Sparkles size={14} />
                <span>Initialize Routine Node</span>
              </h3>
              <button 
                onClick={() => setNewHabitModal(false)}
                className="text-gray-500 hover:text-pink-500 text-xs font-mono"
              >
                [ESC_CLOSE]
              </button>
            </div>

            <form onSubmit={addHabit} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-500 uppercase tracking-wider mb-1 font-bold">Routine Name</label>
                <input 
                  type="text" 
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  placeholder="e.g. Daily Gym Session"
                  className="w-full bg-black border border-gray-800 hover:border-cyan-800 focus:border-cyan-400 focus:outline-none p-2 text-gray-100 font-mono transition-colors"
                  maxLength={40}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-500 uppercase tracking-wider mb-1 font-bold">Category</label>
                  <select 
                    value={newHabitCategory}
                    onChange={(e) => setNewHabitCategory(e.target.value)}
                    className="w-full bg-black border border-gray-800 focus:border-cyan-400 focus:outline-none p-2 text-gray-100 font-mono"
                  >
                    <option value="Routine">Routine</option>
                    <option value="Health">Health</option>
                    <option value="Productivity">Productivity</option>
                    <option value="Learning">Learning</option>
                    <option value="Mental Health">Mental Health</option>
                    <option value="Diet">Diet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-500 uppercase tracking-wider mb-1 font-bold">Emoji Icon</label>
                  <input 
                    type="text" 
                    value={newHabitEmoji}
                    onChange={(e) => setNewHabitEmoji(e.target.value)}
                    placeholder="✨"
                    className="w-full bg-black border border-gray-800 hover:border-cyan-800 focus:border-cyan-400 focus:outline-none p-2 text-gray-100 text-center font-mono transition-colors"
                    maxLength={4}
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button 
                  type="submit"
                  className="flex-grow py-2 bg-cyan-950 text-cyan-400 hover:bg-cyan-500 hover:text-black border border-cyan-800 hover:border-cyan-400 font-bold uppercase transition-all shadow-sm"
                >
                  Write Node
                </button>
                <button 
                  type="button"
                  onClick={() => setNewHabitModal(false)}
                  className="px-4 py-2 bg-black border border-gray-800 hover:border-pink-500 hover:text-pink-500 text-gray-500 font-bold uppercase transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
