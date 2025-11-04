import React, { useState } from 'react';
import { useEffect, useMemo } from 'react';
import varc_paper from './paper/varc_papers.json';
import dilr_paper from './paper/dilr_papers.json';
import qa_paper from './paper/qa_papers.json';
import vedant_response from './vedant_response.json';
import rajat_response from './rajat_response.json';
import answer_key from './answer/answer_key.json';
import questions_type_data from './questions_type_data.json';
import Question from './Question';

const PAPER_CONTENT_MAP = {
  VARC: varc_paper,
  DILR: dilr_paper,
  QA: qa_paper,
};

const ANSWER_KEY_CONTENT = answer_key;
const VEDANT_RESPONSE_CONTENT = vedant_response;
const RAJAT_RESPONSE_CONTENT = rajat_response;
const QUESTION_TYPE_DATA = questions_type_data;

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
      const typeDataForPaper = QUESTION_TYPE_DATA[paperKey] || {};

      let responses;
      if (activeUser === 'VEDANT') {
        responses = VEDANT_RESPONSE_CONTENT[paperKey] || {};
      } else if (activeUser === 'RAJAT') {
        responses = RAJAT_RESPONSE_CONTENT[paperKey] || {};
      }

      // --- START: NEW EXCLUSION LOGIC ---
      const responseValues = Object.values(responses);

      // Check if:
      // a) There is response data for this paper, AND
      // b) Every single response value is 'n' (case-insensitive)
      const allSkipped =
        responseValues.length > 0 &&
        responseValues.every((response) => response?.toLowerCase() === 'n');

      if (allSkipped) {
        // If the user skipped all questions in this paper, skip the entire paper
        // console.log(`Excluding paper ${paperKey} for user ${activeUser}: All questions skipped.`);
        continue;
      }
      // --- END: NEW EXCLUSION LOGIC ---

      // Iterate through each question in the paper
      for (const qKey in questions) {
        if (questions.hasOwnProperty(qKey)) {
          const paper = questions[qKey];
          const correct = answers[qKey]?.toLowerCase() || '';
          const userResponse = responses[qKey]?.toLowerCase() || '';

          // Get the specific type data for the question
          const questionType = typeDataForPaper[qKey] || {}; // <--- GET QUESTION TYPE
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
            subsection: questionType.subsection || 'N/A',
            difficulty: questionType.difficulty || 'N/A',
          });
        }
      }
    }
  }
  return allQuestions;
};

const SectionTab = ({
  section,
  activeUser,
}) => {
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'CORRECT', 'SKIPPED', 'WRONG'
  const [subsectionFilter, setSubsectionFilter] = useState('ALL');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState([]);

  // Data fetching and processing happens only when the component mounts or section changes
  useEffect(() => {

    setIsLoading(true);
    // Pass the otherUserResponses to the combiner
    const combined = combineAllDataForSection(
      section,
      activeUser
    );
    setQuestions(combined);
    setCurrentQuestionIndex(0);
    setIsLoading(false);
  }, [section, activeUser]); // Added dependencies

  // NEW: Calculate unique subsections and their counts based on the current status filter
  const subsectionsData = useMemo(() => {
    // 1. Apply status filter (ALL, CORRECT, WRONG, SKIPPED)
    const statusFiltered =
      filter === 'ALL'
        ? questions
        : questions.filter((q) => q.status === filter);

    // 2. Calculate counts for each subsection
    const counts = statusFiltered.reduce((acc, q) => {
      acc[q.subsection] = (acc[q.subsection] || 0) + 1;
      return acc;
    }, {});

    // 3. Get sorted list of unique subsections
    const sortedSubsections = Object.keys(counts).sort();

    // 4. Calculate total count for the "ALL" option in the dropdown
    const totalStatusFilteredCount = Object.values(counts).reduce(
      (sum, count) => sum + count,
      0
    );

    return { sortedSubsections, counts, totalStatusFilteredCount };
  }, [questions, filter]); // Now depends on 'filter'

  // Destructure for easier use
  const {
    sortedSubsections,
    counts: subsectionCounts,
    totalStatusFilteredCount,
  } = subsectionsData;

  // Filtered questions are memoized for performance
  const filteredQuestions = useMemo(() => {
    let filtered = questions;

    // 1. Filter by Status (ALL, CORRECT, WRONG, SKIPPED)
    if (filter !== 'ALL') {
      filtered = filtered.filter((q) => q.status === filter);
    }

    // 2. Filter by Subsection (ALL or specific subsection)
    if (subsectionFilter !== 'ALL') {
      filtered = filtered.filter((q) => q.subsection === subsectionFilter);
    }

    // 3. Sort by TNO descending
    return filtered.sort((a, b) => b.tno - a.tno);
  }, [questions, filter, subsectionFilter]);

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
          onClick={() => {
            setFilter('ALL');
            setCurrentQuestionIndex(0);
            setSubsectionFilter('ALL'); // <--- ADDED RESET
          }}
          className={filterButtonClass('ALL')}
        >
          All ({questions.length})
        </button>
        <button
          onClick={() => {
            setFilter('CORRECT');
            setCurrentQuestionIndex(0);
            setSubsectionFilter('ALL'); // <--- ADDED RESET
          }}
          className={filterButtonClass('CORRECT')}
        >
          Correct ({statusCounts.CORRECT || 0})
        </button>
        <button
          onClick={() => {
            setFilter('WRONG');
            setCurrentQuestionIndex(0);
            setSubsectionFilter('ALL'); // <--- ADDED RESET
          }}
          className={filterButtonClass('WRONG')}
        >
          Wrong ({statusCounts.WRONG || 0})
        </button>
        <button
          onClick={() => {
            setFilter('SKIPPED');
            setCurrentQuestionIndex(0);
            setSubsectionFilter('ALL'); // <--- ADDED RESET
          }}
          className={filterButtonClass('SKIPPED')}
        >
          Skipped ({statusCounts.SKIPPED || 0})
        </button>
      </div>

      <div className='mb-6 p-3 bg-white rounded-xl shadow-inner border'>
        <label
          htmlFor='subsection-select'
          className='text-sm font-medium text-gray-700 mr-3'
        >
          Filter by Sub-Section:
        </label>
        <select
          id='subsection-select'
          value={subsectionFilter}
          onChange={(e) => {
            setSubsectionFilter(e.target.value);
            setCurrentQuestionIndex(0); // Reset index on filter change
          }}
          className='mt-1 block w-full md:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md'
        >
          <option value='ALL'>
            ALL Subsections ({totalStatusFilteredCount})
          </option>
          {sortedSubsections.map((sub) => {
            // Use the pre-calculated count based on the current status filter
            const count = subsectionCounts[sub];
            return (
              <option key={sub} value={sub}>
                {sub} ({count})
              </option>
            );
          })}
        </select>
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
          key={currentQuestion.id}
          activeSection={section}
          questionData={currentQuestion}
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
const PaperAnalysis = () => {
  const [activeTab, setActiveTab] = useState('VARC'); // VARC, DILR, QA
  const [activeUser, setActiveUser] = useState('VEDANT'); // VEDANT, RAJAT



  // Tailwind CSS classes for aesthetics
  const buttonBase =
    'py-2 px-4 text-sm font-semibold rounded-lg shadow-md transition duration-300 mr-2';

  return (
    <div className='p-6 md:p-10 bg-gray-50 min-h-screen font-sans'>
      {/* Header and User Selection */}
      <div className='flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b pb-4'>
        <h1 className='text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 md:mb-0'>
          Aggregated Paper Analysis
        </h1>

        <div className='flex flex-wrap items-center'>
          <span className='text-gray-700 font-medium mr-4'>Analyze for:</span>
          <button
            onClick={() => setActiveUser('VEDANT')}
            className={`${buttonBase} ${
              activeUser === 'VEDANT'
                ? 'bg-indigo-600 text-white shadow-indigo-400'
                : 'bg-white text-indigo-600 border border-indigo-400 hover:bg-indigo-50'
            }`}
          >
            Vedant
          </button>
          <button
            onClick={() => setActiveUser('RAJAT')}
            className={`${buttonBase} ${
              activeUser === 'RAJAT'
                ? 'bg-indigo-600 text-white shadow-indigo-400'
                : 'bg-white text-indigo-600 border border-indigo-400 hover:bg-indigo-50'
            }`}
          >
            Rajat
          </button>
        </div>
      </div>


      {/* Tabs Navigation */}
      <div className='flex border-b border-gray-200 mb-18 bg-gray-50 z-10 shadow-sm rounded-t-xl'>
        {['VARC', 'DILR', 'QA'].map((section) => (
          <button
            key={section}
            onClick={() => setActiveTab(section)}
            className={`px-6 py-3 text-base font-semibold transition-all duration-300 ${
              activeTab === section
                ? 'text-indigo-600 border-b-4 border-indigo-600 bg-white'
                : 'text-gray-500 hover:text-indigo-700 hover:bg-gray-100'
            }`}
          >
            {section}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className='bg-white p-4 rounded-b-xl shadow-2xl'>
        {/* Key prop ensures the component re-renders when the user, idcard, or tab changes */}
        <SectionTab
          key={`${activeTab}-${activeUser}`}
          section={activeTab}
          activeUser={activeUser}
        />
      </div>
    </div>
  );
};

export default PaperAnalysis;
