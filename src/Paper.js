import React, { useState } from 'react';
import { useEffect, useMemo, useCallback } from 'react'; // Added useCallback
import varc_paper from './paper/varc_papers.json';
import dilr_paper from './paper/dilr_papers.json';
import qa_paper from './paper/qa_papers.json';
import vedant_response from './vedant_response.json';
import rajat_response from './rajat_response.json';
import ishani_response from './ishani_response.json';
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
const ISHANI_RESPONSE_CONTENT = ishani_response;
const QUESTION_TYPE_DATA = questions_type_data;

// --- LOCAL STORAGE HELPERS ---
// Key format: USER_SECTION_PAPERKEY_QKEY
const getStorageKey = (activeUser, id) => `${activeUser}_${id}`;
const getBookmarks = () => {
  try {
    const bookmarks = localStorage.getItem('analysis_bookmarks');
    return bookmarks ? JSON.parse(bookmarks) : {};
  } catch (error) {
    console.error('Error reading bookmarks from local storage:', error);
    return {};
  }
};
const saveBookmarks = (bookmarks) => {
  try {
    localStorage.setItem('analysis_bookmarks', JSON.stringify(bookmarks));
  } catch (error) {
    console.error('Error saving bookmarks to local storage:', error);
  }
};
const getNotes = () => {
  try {
    const notes = localStorage.getItem('analysis_notes');
    return notes ? JSON.parse(notes) : {};
  } catch (error) {
    console.error('Error reading notes from local storage:', error);
    return {};
  }
};
const saveNotes = (notes) => {
  try {
    localStorage.setItem('analysis_notes', JSON.stringify(notes));
  } catch (error) {
    console.error('Error saving notes to local storage:', error);
  }
};
// -----------------------------

const combineAllDataForSection = (section, activeUser) => {
  const allQuestions = [];
  const paperTests = PAPER_CONTENT_MAP[section] || {};

  for (const paperKey in paperTests) {
    if (paperTests.hasOwnProperty(paperKey)) {
      const [tno] = paperKey.split('_');
      const questions = paperTests[paperKey];

      const answers = ANSWER_KEY_CONTENT[paperKey] || {};
      const typeDataForPaper = QUESTION_TYPE_DATA[paperKey] || {};

      let responses;
      if (activeUser === 'VEDANT') {
        responses = VEDANT_RESPONSE_CONTENT[paperKey] || {};
      } else if (activeUser === 'RAJAT') {
        responses = RAJAT_RESPONSE_CONTENT[paperKey] || {};
      } else if (activeUser === 'ISHANI') {
        responses = ISHANI_RESPONSE_CONTENT[paperKey] || {};
      } else {
        responses = {};
      }

      // --- NEW EXCLUSION LOGIC ---
      const responseValues = Object.values(responses);
      const allSkipped =
        responseValues.length > 0 &&
        responseValues.every((response) => response?.toLowerCase() === 'n');

      if (allSkipped) {
        continue;
      }
      // --- END: NEW EXCLUSION LOGIC ---

      for (const qKey in questions) {
        if (questions.hasOwnProperty(qKey)) {
          const paper = questions[qKey];
          const correct = answers[qKey]?.toLowerCase() || '';
          const userResponse = responses[qKey]?.toLowerCase() || '';
          const uniqueID = `${paperKey}_${qKey}`; // PAPERKEY_QKEY

          const questionType = typeDataForPaper[qKey] || {};
          let status;
          if (userResponse !== correct && userResponse !== 'n') {
            status = 'WRONG';
          } else if (userResponse === correct) {
            status = 'CORRECT';
          } else {
            status = 'SKIPPED';
          }

          allQuestions.push({
            id: uniqueID, // PAPERKEY_QKEY Unique ID
            tno,
            section,
            qKey,
            status,
            paperKey, // Added for full ID
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

const SectionTab = ({ section, activeUser }) => {
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'CORRECT', 'SKIPPED', 'WRONG', 'BOOKMARKED'
  const [subsectionFilter, setSubsectionFilter] = useState('ALL');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  // NEW: State for live note and bookmark status on the current question
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [tempNote, setTempNote] = useState('');
  // NEW STATE: Force re-calculate bookmark count
  const [bookmarkCountRefresher, setBookmarkCountRefresher] = useState(0);

  // Data fetching and processing happens only when the component mounts or section changes
  useEffect(() => {
    setIsLoading(true);
    const combined = combineAllDataForSection(section, activeUser);
    setQuestions(combined);
    setCurrentQuestionIndex(0);
    setIsLoading(false);
  }, [section, activeUser]);

  // NEW: Effect to update note/bookmark state when question index or filters change
  useEffect(() => {
    if (filteredQuestions.length > 0) {
      const currentQ = filteredQuestions[currentQuestionIndex];
      const storageKey = getStorageKey(activeUser, currentQ.id);

      // Check Bookmark Status
      const bookmarks = getBookmarks();
      setIsBookmarked(!!bookmarks[storageKey]);

      // Check Note Status
      const notes = getNotes();
      const existingNote = notes[storageKey]?.note || '';
      setCurrentNote(existingNote);
      setTempNote(existingNote);
      setIsEditingNote(false);
    }
  }, [currentQuestionIndex, activeUser, questions, filter, subsectionFilter]);

  // NEW: Calculate unique subsections and their counts based on the current status filter
  const subsectionsData = useMemo(() => {
    // 1. Apply status filter (ALL, CORRECT, WRONG, SKIPPED, BOOKMARKED)
    let statusFiltered = questions;
    if (filter !== 'ALL') {
      statusFiltered = questions.filter((q) => {
        if (filter === 'BOOKMARKED') {
          const bookmarks = getBookmarks();
          const storageKey = getStorageKey(activeUser, q.id);
          return !!bookmarks[storageKey];
        }
        return q.status === filter;
      });
    }

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
  }, [questions, filter, activeUser]); // Now depends on 'filter' and 'activeUser'

  // Destructure for easier use
  const {
    sortedSubsections,
    counts: subsectionCounts,
    totalStatusFilteredCount,
  } = subsectionsData;

  // Filtered questions are memoized for performance
  const filteredQuestions = useMemo(() => {
    let filtered = questions;

    // 1. Filter by Status (ALL, CORRECT, WRONG, SKIPPED, BOOKMARKED)
    if (filter !== 'ALL') {
      filtered = questions.filter((q) => {
        if (filter === 'BOOKMARKED') {
          const bookmarks = getBookmarks();
          const storageKey = getStorageKey(activeUser, q.id);
          return !!bookmarks[storageKey];
        }
        return q.status === filter;
      });
    }

    // 2. Filter by Subsection (ALL or specific subsection)
    if (subsectionFilter !== 'ALL') {
      filtered = filtered.filter((q) => q.subsection === subsectionFilter);
    }

    // 3. Sort by TNO descending
    return filtered.sort((a, b) => b.tno - a.tno);
  }, [questions, filter, subsectionFilter, activeUser]);

  // NEW: Calculate status counts including the bookmark count
  const statusCounts = useMemo(() => {
    const counts = questions.reduce((acc, q) => {
      acc[q.status] = (acc[q.status] || 0) + 1;
      return acc;
    }, {});
    const bookmarks = getBookmarks();
    counts.BOOKMARKED = questions.filter((q) => {
      const storageKey = getStorageKey(activeUser, q.id);
      return !!bookmarks[storageKey];
    }).length;
    return counts;
  }, [questions, activeUser, bookmarkCountRefresher]);

  // --- NEW: BOOKMARK HANDLERS ---
  const toggleBookmark = useCallback(() => {
    if (filteredQuestions.length === 0) return;
    const currentQ = filteredQuestions[currentQuestionIndex];
    const storageKey = getStorageKey(activeUser, currentQ.id);

    const bookmarks = getBookmarks();

    if (bookmarks[storageKey]) {
      // Remove bookmark
      delete bookmarks[storageKey];
      setIsBookmarked(false);
    } else {
      // Add bookmark
      bookmarks[storageKey] = {
        user: activeUser,
        section: currentQ.section,
        tno: currentQ.tno,
        qKey: currentQ.qKey,
        paperKey: currentQ.paperKey,
        timestamp: new Date().toISOString(),
      };
      setIsBookmarked(true);
    }
    saveBookmarks(bookmarks);

    // NEW: Increment state to force statusCounts re-calculation
    setBookmarkCountRefresher((prev) => prev + 1);

    // If the 'BOOKMARKED' filter is active, force a re-render of the filtered list
    if (filter === 'BOOKMARKED') {
      setFilter('BOOKMARKED'); // Force state change to trigger useMemo
    }
  }, [
    activeUser,
    currentQuestionIndex,
    filteredQuestions,
    filter,
    setFilter,
    setBookmarkCountRefresher,
  ]);
  // --- END: BOOKMARK HANDLERS ---

  // --- NEW: NOTE HANDLERS ---
  const saveNote = () => {
    if (filteredQuestions.length === 0) return;
    const currentQ = filteredQuestions[currentQuestionIndex];
    const storageKey = getStorageKey(activeUser, currentQ.id);

    const notes = getNotes();

    if (tempNote.trim() === '') {
      // Remove note if empty
      delete notes[storageKey];
      setCurrentNote('');
    } else {
      // Add or update note
      notes[storageKey] = {
        user: activeUser,
        section: currentQ.section,
        tno: currentQ.tno,
        qKey: currentQ.qKey,
        paperKey: currentQ.paperKey,
        note: tempNote.trim(),
        timestamp: new Date().toISOString(),
      };
      setCurrentNote(tempNote.trim());
    }

    saveNotes(notes);
    setIsEditingNote(false);
  };

  const removeNote = () => {
    if (filteredQuestions.length === 0) return;
    const currentQ = filteredQuestions[currentQuestionIndex];
    const storageKey = getStorageKey(activeUser, currentQ.id);

    const notes = getNotes();
    delete notes[storageKey];
    saveNotes(notes);
    setCurrentNote('');
    setTempNote('');
    setIsEditingNote(false);
  };
  // --- END: NOTE HANDLERS ---

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

  const currentQuestion = filteredQuestions[currentQuestionIndex];

  return (
    <div className='p-4'>
      {/* Status Filters */}
      <div className='flex flex-wrap gap-3 mb-6 p-3 bg-white rounded-xl shadow-inner border'>
        <button
          onClick={() => {
            setFilter('ALL');
            setCurrentQuestionIndex(0);
            setSubsectionFilter('ALL');
          }}
          className={filterButtonClass('ALL')}
        >
          All ({questions.length})
        </button>
        <button
          onClick={() => {
            setFilter('CORRECT');
            setCurrentQuestionIndex(0);
            setSubsectionFilter('ALL');
          }}
          className={filterButtonClass('CORRECT')}
        >
          Correct ({statusCounts.CORRECT || 0})
        </button>
        <button
          onClick={() => {
            setFilter('WRONG');
            setCurrentQuestionIndex(0);
            setSubsectionFilter('ALL');
          }}
          className={filterButtonClass('WRONG')}
        >
          Wrong ({statusCounts.WRONG || 0})
        </button>
        <button
          onClick={() => {
            setFilter('SKIPPED');
            setCurrentQuestionIndex(0);
            setSubsectionFilter('ALL');
          }}
          className={filterButtonClass('SKIPPED')}
        >
          Skipped ({statusCounts.SKIPPED || 0})
        </button>
        {/* NEW: Bookmark Filter Button */}
        <button
          onClick={() => {
            setFilter('BOOKMARKED');
            setCurrentQuestionIndex(0);
            setSubsectionFilter('ALL');
          }}
          className={filterButtonClass('BOOKMARKED')}
        >
          {isBookmarked ? '⭐ Bookmarked' : '☆ Bookmark'} (
          {statusCounts.BOOKMARKED || 0})
        </button>
      </div>

      {/* Subsection Filter */}
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
            const count = subsectionCounts[sub];
            return (
              <option key={sub} value={sub}>
                {sub} ({count})
              </option>
            );
          })}
        </select>
      </div>

      {/* Question Navigation and Controls (Bookmark/Note) */}
      <div className='flex justify-between items-center mb-4 p-3 bg-indigo-50 rounded-xl shadow-sm'>
        <div className='flex gap-2'>
          <button
            className='nav-button prev px-4 py-2 bg-indigo-600 text-white rounded-md disabled:opacity-50'
            onClick={handlePrev}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </button>
          <button
            className='nav-button next px-4 py-2 bg-indigo-600 text-white rounded-md disabled:opacity-50'
            onClick={handleNext}
            disabled={currentQuestionIndex >= filteredQuestions.length - 1}
          >
            Next
          </button>
          <strong className='flex items-center text-indigo-800 ml-4'>
            Question {currentQuestionIndex + 1} of {filteredQuestions.length}
          </strong>
        </div>
        <div className='flex gap-3'>
          {/* Bookmark Button */}
          <button
            onClick={toggleBookmark}
            className={`p-2 rounded-full shadow-md transition-all duration-200 ${
              isBookmarked
                ? 'bg-yellow-400 text-white hover:bg-yellow-500'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title={isBookmarked ? 'Remove Bookmark' : 'Add Bookmark'}
          >
            {isBookmarked ? '★' : '☆'}
          </button>
        </div>
      </div>

      {/* Note Section */}
      <div className='mb-6 p-4 bg-gray-100 rounded-xl shadow-inner border border-gray-200'>
        <h3 className='text-lg font-bold text-gray-800 mb-2 flex items-center'>
          📝 My Notes:
          {currentQuestion && (
            <span className='text-xs font-normal text-gray-500 ml-2'>
              (User: {activeUser} | Test: {currentQuestion.tno} | Q:
              {currentQuestion.qKey})
            </span>
          )}
        </h3>

        {isEditingNote || !currentNote ? (
          <div>
            <textarea
              className='w-full p-2 border rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500'
              rows='4'
              placeholder='Add your notes here...'
              value={tempNote}
              onChange={(e) => setTempNote(e.target.value)}
            />
            <div className='flex gap-2 mt-2'>
              <button
                onClick={saveNote}
                className='px-4 py-2 text-sm font-medium rounded-md bg-green-500 text-white hover:bg-green-600'
              >
                {currentNote ? 'Update Note' : 'Add Note'}
              </button>
              {currentNote && (
                <>
                  <button
                    onClick={() => setIsEditingNote(false)}
                    className='px-4 py-2 text-sm font-medium rounded-md bg-gray-500 text-white hover:bg-gray-600'
                  >
                    Cancel
                  </button>
                  <button
                    onClick={removeNote}
                    className='px-4 py-2 text-sm font-medium rounded-md bg-red-500 text-white hover:bg-red-600'
                  >
                    Remove Note
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className='bg-white p-3 rounded-md shadow-inner relative'>
            <p className='whitespace-pre-wrap text-gray-700'>{currentNote}</p>
            <button
              onClick={() => setIsEditingNote(true)}
              className='absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded-md bg-indigo-500 text-white hover:bg-indigo-600'
              title='Edit Note'
            >
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Question Component */}
      <div className='space-y-4'>
        {currentQuestion && (
          <Question
            key={currentQuestion.id}
            activeSection={section}
            questionData={currentQuestion}
          />
        )}
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
  const [activeUser, setActiveUser] = useState('VEDANT'); // VEDANT, RAJAT, ISHANI

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
          <button
            onClick={() => setActiveUser('ISHANI')}
            className={`${buttonBase} ${
              activeUser === 'ISHANI'
                ? 'bg-indigo-600 text-white shadow-indigo-400'
                : 'bg-white text-indigo-600 border border-indigo-400 hover:bg-indigo-50'
            }`}
          >
            ISHANI
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
