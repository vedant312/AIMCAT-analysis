import React, { useState } from 'react';
import { CheckCircle, XCircle, MinusCircle, Eye, EyeOff } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import varc_paper from './paper/varc_papers.json';
import dilr_paper from './paper/dilr_papers.json';
import qa_paper from './paper/qa_papers.json';
import vedant_response from './vedant_response.json';
import rajat_response from './rajat_response.json';
import answer_key from './answer/answer_key.json';
import Question from './Question';

const PAPER_CONTENT_MAP = {
  VARC: varc_paper,
  DILR: dilr_paper,
  QA: qa_paper,
};

const ANSWER_KEY_CONTENT = answer_key;
const VEDANT_RESPONSE_CONTENT = vedant_response;
const RAJAT_RESPONSE_CONTENT = rajat_response;

const combineAllDataForSection = (section, activeUser) => {
  const allQuestions = [];
  const paperTests = PAPER_CONTENT_MAP[section] || {};

  // Iterate through each test paper available for the section
  for (const paperKey in paperTests) {
    if (paperTests.hasOwnProperty(paperKey)) {
      const [tno] = paperKey.split('_');
      const questions = paperTests[paperKey];

      // Look up answers and responses in their separate simulated JSON files
      const answers = ANSWER_KEY_CONTENT[paperKey] || {};
      const responses =
        activeUser === 'VEDANT'
          ? VEDANT_RESPONSE_CONTENT[paperKey] || {}
          : RAJAT_RESPONSE_CONTENT[paperKey] || {};

      // Iterate through each question in the paper
      for (const qKey in questions) {
        if (questions.hasOwnProperty(qKey)) {
          const paper = questions[qKey];
          const correct = answers[qKey]?.toLowerCase() || '';
          const userResponse = responses[qKey]?.toLowerCase() || '';

          let status;
          if (userResponse !== correct && userResponse !== 'n') {
            status = 'WRONG';
          } else if (userResponse === correct) {
            status = 'CORRECT';
          } else {
            status = 'SKIPPED';
          }

          allQuestions.push({
            id: `${paperKey}_${qKey}`, // Unique ID
            tno,
            section,
            qKey,
            status,
            questionText:
              paper.ENGLISH?.QUESTION_TEXT || 'Question text unavailable.',
            options: [
              paper.ENGLISH?.OPT1 || '',
              paper.ENGLISH?.OPT2 || '',
              paper.ENGLISH?.OPT3 || '',
              paper.ENGLISH?.OPT4 || '',
            ],
            pattern: paper.QUESTION_TYPE === '2' ? 'FILLN' : 'MCQ',
            correctAnswer: correct,
            essay: paper.ENGLISH?.EASSY_DETAILS || '',
            essay_id: paper.ENGLISH?.ESSAY_ID || '',
            userResponse: userResponse === 'n' ? 'Skipped' : userResponse,
          });
        }
      }
    }
  }
  return allQuestions;
};

const SectionTab = ({ section, activeUser }) => {
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'CORRECT', 'SKIPPED', 'WRONG'
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState([]);

  // Data fetching and processing happens only when the component mounts or section changes
  useEffect(() => {
    setIsLoading(true);
    // In a real app, this would be an API call or file load
    const combined = combineAllDataForSection(section, activeUser);
    setQuestions(combined);
    setCurrentQuestionIndex(0);
    setIsLoading(false);
  }, [section, activeUser]);

  // Filtered questions are memoized for performance
  const filteredQuestions = useMemo(() => {
    if (filter === 'ALL') {
      return questions.sort((a, b) => b.tno - a.tno); // Sort by TNO descending
    }
    return questions
      .filter((q) => q.status === filter)
      .sort((a, b) => b.tno - a.tno);
  }, [questions, filter]);

  // Navigation Handlers
  const handleNext = () => {
    setCurrentQuestionIndex((prev) =>
      Math.min(prev + 1, filteredQuestions.length - 1)
    );
  };

  const handlePrev = () => {
    setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0));
  };

  if (isLoading) {
    return (
      <div className='text-center p-8 text-gray-500'>
        Loading aggregated analysis for {section}...
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className='text-center p-8 text-gray-500'>
        No questions found across all papers for {section}.
      </div>
    );
  }

  const filterButtonClass = (buttonFilter) =>
    `px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200 ${
      filter === buttonFilter
        ? 'active-button'
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }`;

  const statusCounts = questions.reduce((acc, q) => {
    acc[q.status] = (acc[q.status] || 0) + 1;
    return acc;
  }, {});

  const currentQuestion = filteredQuestions[currentQuestionIndex];

  return (
    <div className='p-4'>
      <div className='flex flex-wrap gap-3 mb-6 p-3 bg-white rounded-xl shadow-inner border'>
        <button
          onClick={() => setFilter('ALL')}
          className={filterButtonClass('ALL')}
        >
          All ({questions.length})
        </button>
        <button
          onClick={() => setFilter('CORRECT')}
          className={filterButtonClass('CORRECT')}
        >
          Correct ({statusCounts.CORRECT || 0})
        </button>
        <button
          onClick={() => setFilter('WRONG')}
          className={filterButtonClass('WRONG')}
        >
          Wrong ({statusCounts.WRONG || 0})
        </button>
        <button
          onClick={() => setFilter('SKIPPED')}
          className={filterButtonClass('SKIPPED')}
        >
          Skipped ({statusCounts.SKIPPED || 0})
        </button>
      </div>
      <div className='question-navigation-controls'>
        <button
          className='nav-button prev'
          onClick={handlePrev}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </button>
        <button
          className='nav-button next'
          onClick={handleNext}
          disabled={currentQuestionIndex === currentQuestionIndex.length - 1}
        >
          Next
        </button>
      </div>
      <div className='space-y-4'>
        <Question
          activeSection={section}
          questionData={currentQuestion}
          initialShowSolution={false}
        />
      </div>

      {filteredQuestions.length === 0 && (
        <div className='text-center p-10 bg-white rounded-xl text-gray-500'>
          No questions match the "{filter.toLowerCase()}" filter in {section}.
        </div>
      )}
    </div>
  );
};

// 4. Paper Analysis Component (Main route for analysis)
const PaperAnalysis = ({ navigate }) => {
  const [activeTab, setActiveTab] = useState('VARC'); // VARC, DILR, QA
  const [activeUser, setActiveUser] = useState('VEDANT'); // VEDANT, RAJAT

  return (
    <div className='p-6 md:p-10 bg-gray-50 min-h-screen'>
      <div className='flex justify-between items-center mb-6 border-b pb-4'>
        <h1 className='text-3xl md:text-4xl font-extrabold text-gray-900'>
          Aggregated Paper Analysis
        </h1>
        <button
          onClick={() => {
            setActiveUser('VEDANT');
          }}
          className={`py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-md transition duration-300 mr-4 ${
            activeUser === 'VEDANT' ? 'active-button' : ''
          }`}
        >
          Vedant
        </button>
        <button
          onClick={() => {
            setActiveUser('RAJAT');
          }}
          className={`py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-md transition duration-300 mr-4 ${
            activeUser === 'RAJAT' ? 'active-button' : ''
          }`}
        >
          Rajat
        </button>
        <button
          onClick={() => navigate('dashboard')}
          className='py-2 px-4 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow-md transition duration-300'
        >
          &larr; Back to Dashboard
        </button>
      </div>

      <p className='text-gray-600 mb-6'>
        Viewing all questions from TNO 2625 to 2603 (mocked for 2625 & 2624)
        combined.
      </p>

      {/* Tabs Navigation */}
      <div className='flex border-b border-gray-200 mb-6 sticky top-0 bg-gray-50 z-10 shadow-sm'>
        {['VARC', 'DILR', 'QA'].map((section) => (
          <button
            key={section}
            onClick={() => setActiveTab(section)}
            className={`px-4 py-2 text-sm font-medium transition-colors duration-200 ${
              activeTab === section
                ? 'active-button'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {section}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className='bg-white p-4 rounded-xl shadow-2xl'>
        {/* Key prop ensures the component re-renders when the tab changes */}
        <SectionTab
          key={activeTab}
          section={activeTab}
          activeUser={activeUser}
        />
      </div>
    </div>
  );
};

export default PaperAnalysis;
