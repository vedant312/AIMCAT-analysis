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
} from 'recharts';
import { TrendingUp, BookOpen, Target, Award } from 'lucide-react';
import PaperAnalysis from './Paper';
import './App.css';

const AIMCATDashboard = ({ navigate }) => {
  // Section-wise strengths & weaknesses analysis
  const [data, setData] = useState([]);
  const getSectionStats = () => {
    if (data.length === 0) return null;
    const sections = [
      { key: 'sectionI', label: 'VARC' },
      { key: 'sectionII', label: 'DILR' },
      { key: 'sectionIII', label: 'Quant' },
    ];
    const stats = sections.map((section) => {
      const percentiles = data.map((d) => d[section.key].percentile);
      const avg = percentiles.reduce((a, b) => a + b, 0) / percentiles.length;
      const max = Math.max(...percentiles);
      const min = Math.min(...percentiles);
      return { ...section, avg, max, min };
    });
    // Find strongest and weakest section by avg percentile
    const strongest = stats.reduce((a, b) => (a.avg > b.avg ? a : b));
    const weakest = stats.reduce((a, b) => (a.avg < b.avg ? a : b));
    return { stats, strongest, weakest };
  };

  const sectionStats = getSectionStats();

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
    //remove first element and last 3 elements
    const sorted = parsedData.sort((a, b) => a.testNumber - b.testNumber);
    return sorted.slice(1, sorted.length - 4);
  };

  // State for idcardno input, prefix input, and submitted values
  const [idcardnoInput, setIdcardnoInput] = useState('');
  const [prefixInput, setPrefixInput] = useState('');
  const [idcardno, setIdcardno] = useState('');
  const [prefix, setPrefix] = useState('595948');

  // Default idcardno value (encoded demo)
  const defaultIdcardno =
    '575b482b575b483d575b482c575b482e575b482d575b485a575b482e575b485c575b485d575b4856575b48';

  const defaultTestno = '5956485D595648595956485F59564858595648';

  const defaultFl = '5956485E595648';

  const [extraData, setExtraData] = useState(null);

  const [extraName, setExtraName] = useState('');

  // Function to fetch extra API data
  const fetchExtraData = async (usedIdcardno) => {
    try {
      const proxyUrl = 'https://api.allorigins.win/raw?url=';
      const targetUrl = `https://www.time4education.com/moodle/aimcatresults/aimcat_performance.asp?testno=${defaultTestno}&idcardno=${usedIdcardno}&fl=${defaultFl}`;
      const response = await fetch(proxyUrl + encodeURIComponent(targetUrl));
      if (!response.ok) throw new Error('Extra API error');
      const htmlText = await response.text();

      // Extract name from <th class="th-last">
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      const th = doc.querySelector('th.th-last');
      let extractedName = '';
      if (th) {
        // Example innerHTML: "Id : DRCAB5A329 &nbsp;&nbsp;<br> Name : VEDANT DANGI &nbsp;&nbsp;AIMCAT2607"
        const nameMatch = th.innerHTML.match(/Name\s*:\s*([A-Z\s]+)&nbsp;/i);
        if (nameMatch && nameMatch[1]) {
          extractedName = nameMatch[1].trim();
        }
      }
      setExtraName(extractedName);

      const table = doc.querySelector('table');
      return table ? table.outerHTML : '<div>No extra data found.</div>';
    } catch (err) {
      return `<div>Error loading extra data.</div>`;
    }
  };

  // Encode string function (JS version)
  function encodeString(inputString) {
    const charMappings = {
      D: '2b',
      R: '3d',
      C: '2c',
      A: '2e',
      B: '2d',
    };
    const digitMappings = {
      0: '5f',
      1: '5e',
      2: '5d',
      3: '5c',
      4: '5b',
      5: '5a',
      6: '59',
      7: '58',
      8: '57',
      9: '56',
    };
    let usedPrefix = prefix;
    let encoded = '';
    for (let char of inputString) {
      encoded += usedPrefix;
      if (charMappings[char]) {
        encoded += charMappings[char];
      } else if (digitMappings[char]) {
        encoded += digitMappings[char];
      } else {
        // Unknown character
        return null;
      }
    }
    return encoded;
  }

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Using a CORS proxy to fetch the data

        const proxyUrl = 'https://api.allorigins.win/raw?url=';
        let usedIdcardno;
        if (idcardno && idcardno.trim() !== '') {
          const encoded = encodeString(idcardno.trim());
          if (!encoded) {
            setError(
              'Invalid ID Card Number: contains unsupported characters.'
            );
            setLoading(false);
            return;
          }
          usedIdcardno = encoded;
        } else {
          usedIdcardno = defaultIdcardno;
        }
        const targetUrl = `https://www.time4education.com/results/CenterSectionAnalysis_student.asp?idcardno=${usedIdcardno}`;

        const response = await fetch(proxyUrl + encodeURIComponent(targetUrl));

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const htmlText = await response.text();
        const parsedData = parseHTMLData(htmlText);
        console.log('Parsed Data:', parsedData);

        setData(parsedData);
        setError(null);

        // Fetch extra API data
        const extra = await fetchExtraData(usedIdcardno);
        setExtraData(extra);
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
  }, [idcardno, prefix]);

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
          {/* Roll Number Display */}
          <div className='mb-2 text-lg font-bold text-indigo-700'>
            Roll Number:&nbsp;
            {idcardno.trim() === '' ? 'DRCAB5A329' : idcardno}
          </div>
          {extraName && (
            <div className='mb-2 text-lg font-bold text-green-700'>
              Name: {extraName}
            </div>
          )}
          <button
            onClick={() => navigate('analysis')}
            className='w-full py-3 px-6 bg-indigo-500 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition duration-300 transform hover:scale-[1.01]'
          >
            Go to Aggregated Paper Analysis
          </button>
          <p className='text-gray-600'>
            Section-wise Performance Comparison Across AIMCATs
          </p>
          {/* ID Card and Prefix Input with Common Submit Button */}
          <div className='mt-4 flex flex-col items-center'>
            <label
              htmlFor='idcardno'
              className='mb-2 text-gray-700 font-medium'
            >
              Enter your ID Card Number:
            </label>
            <input
              id='idcardno'
              type='text'
              value={idcardnoInput}
              onChange={(e) => setIdcardnoInput(e.target.value.toUpperCase())}
              placeholder='Leave blank for demo data'
              className='border border-gray-300 rounded px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2'
            />
            <label
              htmlFor='prefix'
              className='mb-2 text-gray-700 font-medium mt-2'
            >
              Enter Prefix (optional):
            </label>
            <input
              id='prefix'
              type='text'
              value={prefixInput}
              onChange={(e) => setPrefixInput(e.target.value.toUpperCase())}
              placeholder='Default: 595948'
              className='border border-gray-300 rounded px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2'
            />
            <button
              className='mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2'
              onClick={() => {
                setIdcardno(idcardnoInput.toUpperCase());
                setPrefix(
                  prefixInput.trim() !== ''
                    ? prefixInput.toUpperCase()
                    : '595948'
                );
              }}
            >
              Submit
            </button>
            <span className='text-xs text-gray-500'>
              If left blank, demo data and default prefix will be used.
            </span>
          </div>
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

        {/* Section-wise Strengths & Weaknesses */}
        {sectionStats && (
          <div className='bg-white rounded-lg shadow-lg p-6 mb-8'>
            <h2 className='text-xl font-bold text-gray-800 mb-4'>
              Section-wise Strengths & Weaknesses
            </h2>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              {sectionStats.stats.map((section) => (
                <div
                  key={section.label}
                  className={`rounded-lg p-4 border-l-4 ${
                    section.label === sectionStats.strongest.label
                      ? 'border-green-500 bg-green-50'
                      : section.label === sectionStats.weakest.label
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  <h3 className='text-lg font-semibold mb-2'>
                    {section.label}
                  </h3>
                  <p className='text-sm text-gray-600'>
                    Avg Percentile:{' '}
                    <span className='font-bold'>{section.avg.toFixed(1)}</span>
                  </p>
                  <p className='text-sm text-gray-600'>
                    Best Percentile:{' '}
                    <span className='font-bold'>{section.max}</span>
                  </p>
                  <p className='text-sm text-gray-600'>
                    Lowest Percentile:{' '}
                    <span className='font-bold'>{section.min}</span>
                  </p>
                  {section.label === sectionStats.strongest.label && (
                    <p className='text-green-700 font-bold mt-2'>
                      Strongest Section
                    </p>
                  )}
                  {section.label === sectionStats.weakest.label && (
                    <p className='text-red-700 font-bold mt-2'>
                      Weakest Section
                    </p>
                  )}
                </div>
              ))}
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
                    const order = [
                      'Total Accuracy',
                      'VARC Accuracy',
                      'DILR Accuracy',
                      'Quant Accuracy',
                    ];
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

// 5. Main App Component
function App() {
  const [page, setPage] = useState('dashboard'); // 'dashboard' or 'analysis'

  const navigate = (targetPage) => setPage(targetPage);

  return (
    <div className='font-sans antialiased min-h-screen bg-gray-50'>
      {/* The main content */}
      {page === 'dashboard' ? (
        <AIMCATDashboard navigate={navigate} />
      ) : (
        <PaperAnalysis navigate={navigate} />
      )}
    </div>
  );
}

export default App;
