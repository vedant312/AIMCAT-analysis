import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { TrendingUp, BookOpen, Target, Award } from 'lucide-react';
import './App.css';

const AIMCATDashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to parse HTML response and extract table data
  const parseHTMLData = (htmlString) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    // Find all table rows with data
    const rows = doc.querySelectorAll('table tr');
    const parsedData = [];

    rows.forEach((row, index) => {
      const cells = row.querySelectorAll('td');

      // Skip header rows and empty rows
      if (cells.length >= 13 && cells[0].textContent.includes('AIMCAT')) {
        const aimcatName = cells[0].textContent.trim();

        // Extract section data
        const sectionI = {
          correct: parseInt(cells[1].textContent.trim()) || 0,
          wrong: parseInt(cells[2].textContent.trim()) || 0,
          score: parseInt(cells[3].textContent.trim()) || 0,
          percentile: parseFloat(cells[4].textContent.trim()) || 0,
        };

        const sectionII = {
          correct: parseInt(cells[5].textContent.trim()) || 0,
          wrong: parseInt(cells[6].textContent.trim()) || 0,
          score: parseInt(cells[7].textContent.trim()) || 0,
          percentile: parseFloat(cells[8].textContent.trim()) || 0,
        };

        const sectionIII = {
          correct: parseInt(cells[9].textContent.trim()) || 0,
          wrong: parseInt(cells[10].textContent.trim()) || 0,
          score: parseInt(cells[11].textContent.trim()) || 0,
          percentile: parseFloat(cells[12].textContent.trim()) || 0,
        };

        const total = {
          correct: parseInt(cells[13].textContent.trim()) || 0,
          wrong: parseInt(cells[14].textContent.trim()) || 0,
          score: parseInt(cells[15].textContent.trim()) || 0,
          percentile: parseFloat(cells[16].textContent.trim()) || 0,
        };

        parsedData.push({
          name: aimcatName,
          sectionI,
          sectionII,
          sectionIII,
          total,
          testNumber: parseInt(aimcatName.replace('AIMCAT', '')) || 0,
        });
      }
    });

    // Sort by test number
    //remove first element
    return parsedData.sort((a, b) => a.testNumber - b.testNumber).slice(1);
  };

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Using a CORS proxy to fetch the data
        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        const targetUrl =
          'https://www.time4education.com/results/CenterSectionAnalysis_student.asp?idcardno=575b482b575b483d575b482c575b482e575b482d575b485a575b482e575b485c575b485d575b4856575b48';

        const response = await fetch(proxyUrl + encodeURIComponent(targetUrl));

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const htmlText = await response.text();
        const parsedData = parseHTMLData(htmlText);
        console.log('Parsed Data:', parsedData);

        setData(parsedData);
        setError(null);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to fetch data. Using sample data for demonstration.');

        // Fallback sample data based on the provided HTML
        const sampleData = [];

        setData(sampleData);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate statistics
  const calculateStats = () => {
    if (data.length === 0) return null;

    const totalPercentiles = data.map((d) => d.total.percentile);
    const avgPercentile =
      totalPercentiles.reduce((a, b) => a + b, 0) / totalPercentiles.length;
    const maxPercentile = Math.max(...totalPercentiles);
    const minPercentile = Math.min(...totalPercentiles);
    const totalQuestions = data.reduce(
      (sum, d) => sum + d.total.correct + d.total.wrong,
      0
    );
    const totalCorrect = data.reduce((sum, d) => sum + d.total.correct, 0);
    const accuracy = ((totalCorrect / totalQuestions) * 100).toFixed(1);

    return { avgPercentile, maxPercentile, minPercentile, accuracy };
  };

  const stats = calculateStats();

  // Prepare chart data
  const chartData = data.map((item) => ({
    name: item.name.replace('AIMCAT', ''),
    'Total Percentile': item.total.percentile,
    VARC: item.sectionI.percentile,
    DILR: item.sectionII.percentile,
    Quant: item.sectionIII.percentile,
    'Total Score': item.total.score,
  }));

  const accuracyData = data.map((item) => ({
    name: item.name.replace('AIMCAT', ''),
    'VARC Accuracy': (
      (item.sectionI.correct / (item.sectionI.correct + item.sectionI.wrong)) *
      100
    ).toFixed(1),
    'DILR Accuracy': (
      (item.sectionII.correct /
        (item.sectionII.correct + item.sectionII.wrong)) *
      100
    ).toFixed(1),
    'Quant Accuracy': (
      (item.sectionIII.correct /
        (item.sectionIII.correct + item.sectionIII.wrong)) *
      100
    ).toFixed(1),
    'Total Accuracy': (
      (item.total.correct / (item.total.correct + item.total.wrong)) *
      100
    ).toFixed(1),
  }));

  if (loading) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto'></div>
          <p className='mt-4 text-gray-600'>Loading AIMCAT data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100'>
      <div className='container mx-auto px-4 py-8'>
        {/* Header */}
        <div className='text-center mb-8'>
          <h1 className='text-4xl font-bold text-gray-800 mb-2'>
            AIMCAT Performance Dashboard
          </h1>
          <p className='text-gray-600'>
            Section-wise Performance Comparison Across AIMCATs
          </p>
          {error && (
            <div className='mt-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg'>
              {error}
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
            <div className='bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-500'>
              <div className='flex items-center'>
                <TrendingUp className='h-8 w-8 text-blue-500' />
                <div className='ml-4'>
                  <p className='text-sm font-medium text-gray-600'>
                    Avg Percentile
                  </p>
                  <p className='text-2xl font-bold text-gray-900'>
                    {stats.avgPercentile.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>

            <div className='bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500'>
              <div className='flex items-center'>
                <Award className='h-8 w-8 text-green-500' />
                <div className='ml-4'>
                  <p className='text-sm font-medium text-gray-600'>
                    Best Percentile
                  </p>
                  <p className='text-2xl font-bold text-gray-900'>
                    {stats.maxPercentile}
                  </p>
                </div>
              </div>
            </div>

            <div className='bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500'>
              <div className='flex items-center'>
                <Target className='h-8 w-8 text-red-500' />
                <div className='ml-4'>
                  <p className='text-sm font-medium text-gray-600'>
                    Lowest Percentile
                  </p>
                  <p className='text-2xl font-bold text-gray-900'>
                    {stats.minPercentile}
                  </p>
                </div>
              </div>
            </div>

            <div className='bg-white rounded-lg shadow-lg p-6 border-l-4 border-purple-500'>
              <div className='flex items-center'>
                <BookOpen className='h-8 w-8 text-purple-500' />
                <div className='ml-4'>
                  <p className='text-sm font-medium text-gray-600'>
                    Overall Accuracy
                  </p>
                  <p className='text-2xl font-bold text-gray-900'>
                    {stats.accuracy}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className='grid grid-cols-1 lg:grid-cols-1 gap-8'>
          {/* Percentile Trend Chart */}
          <div className='bg-white rounded-lg shadow-lg p-6 w-full'>
            <h2 className='text-2xl font-bold text-gray-800 mb-4'>
              Percentile Trends
            </h2>
            <ResponsiveContainer width='100%' height={400}>
              <LineChart data={[...chartData].reverse()}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='name' />
                <YAxis domain={[95, 100]} />
                <Tooltip
                  formatter={(value, name) => [`${value}%`, name]}
                  labelFormatter={(label) => `AIMCAT ${label}`}
                  itemSorter={(item) => {
                    const order = ['Total Percentile', 'VARC', 'DILR', 'Quant'];
                    return order.indexOf(item.name);
                  }}
                />
                <Legend />
                <Line
                  type='monotone'
                  dataKey='Total Percentile'
                  stroke='#2563eb'
                  strokeWidth={3}
                  dot={{ fill: '#2563eb', strokeWidth: 2, r: 6 }}
                />
                <Line
                  type='monotone'
                  dataKey='VARC'
                  stroke='#059669'
                  strokeWidth={2}
                  dot={{ fill: '#059669', strokeWidth: 2, r: 4 }}
                />
                <Line
                  type='monotone'
                  dataKey='DILR'
                  stroke='#dc2626'
                  strokeWidth={2}
                  dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
                />
                <Line
                  type='monotone'
                  dataKey='Quant'
                  stroke='#7c3aed'
                  strokeWidth={2}
                  dot={{ fill: '#7c3aed', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className='bg-white rounded-lg shadow-lg p-6 w-full'>
            <h2 className='text-2xl font-bold text-gray-800 mb-4'>
              Accuracy Trends
            </h2>
            <ResponsiveContainer width='100%' height={400}>
              <LineChart data={[...accuracyData].reverse()}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='name' />
                <YAxis domain={[95, 100]} />
                <Tooltip
                  formatter={(value, name) => [`${value}%`, name]}
                  labelFormatter={(label) => `AIMCAT ${label}`}
                  itemSorter={(item) => {
                    const order = ['Total Accuracy', 'VARC Accuracy', 'DILR Accuracy', 'Quant Accuracy'];
                    return order.indexOf(item.name);
                  }}
                />
                <Legend />
                <Line
                  type='monotone'
                  dataKey='Total Accuracy'
                  stroke='#2563eb'
                  strokeWidth={3}
                  dot={{ fill: '#2563eb', strokeWidth: 2, r: 6 }}
                />
                <Line
                  type='monotone'
                  dataKey='VARC Accuracy'
                  stroke='#059669'
                  strokeWidth={2}
                  dot={{ fill: '#059669', strokeWidth: 2, r: 4 }}
                />
                <Line
                  type='monotone'
                  dataKey='DILR Accuracy'
                  stroke='#dc2626'
                  strokeWidth={2}
                  dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
                />
                <Line
                  type='monotone'
                  dataKey='Quant Accuracy'
                  stroke='#7c3aed'
                  strokeWidth={2}
                  dot={{ fill: '#7c3aed', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Data Table */}
        <div className='bg-white rounded-lg shadow-lg p-6 mt-8'>
          <h2 className='text-2xl font-bold text-gray-800 mb-4'>
            Detailed Performance
          </h2>
          <div className='overflow-x-auto'>
            <table className='min-w-full table-auto'>
              <thead>
                <tr className='bg-gray-50'>
                  <th className='px-4 py-2 text-left'>AIMCAT</th>
                  <th className='px-4 py-2 text-center'>Total Correct</th>
                  <th className='px-4 py-2 text-center'>Total Wrong</th>
                  <th className='px-4 py-2 text-center'>Total Score</th>
                  <th className='px-4 py-2 text-center'>Total Percentile</th>
                  <th className='px-4 py-2 text-center'>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr
                    key={index}
                    className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                  >
                    <td className='px-4 py-2 font-medium'>{item.name}</td>
                    <td className='px-4 py-2 text-center'>
                      {item.total.correct}
                    </td>
                    <td className='px-4 py-2 text-center'>
                      {item.total.wrong}
                    </td>
                    <td className='px-4 py-2 text-center'>
                      {item.total.score}
                    </td>
                    <td
                      className={`px-4 py-2 text-center font-bold ${
                        item.total.percentile < 85
                          ? 'text-red-600 bg-red-100'
                          : 'text-green-600'
                      }`}
                    >
                      {item.total.percentile}%
                    </td>
                    <td className='px-4 py-2 text-center'>
                      {(
                        (item.total.correct /
                          (item.total.correct + item.total.wrong)) *
                        100
                      ).toFixed(1)}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className='text-sm text-red-600 mt-4'>
            <strong>Note:</strong> Percentiles under 85 are highlighted in red
          </p>
        </div>

        {/* Footer */}
        <div className='text-center mt-8 text-gray-600'>
          <p>
            &copy; 2024 AIMCAT Performance Dashboard. Data sourced from T.I.M.E
            4 Education.
          </p>
        </div>
      </div>
    </div>
  );
};

function App() {
  return <AIMCATDashboard />;
}

export default App;
