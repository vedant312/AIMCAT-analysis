import React, { useState } from 'react';
import './styles.css';
import { CheckCircle, XCircle, MinusCircle, Eye, EyeOff } from 'lucide-react';

// Helper function to clean up HTML strings
const cleanHtmlString = (htmlString) => {
  const safeHtmlString = htmlString || '';
  return safeHtmlString
    .replace(/<\/span>/g, '</span><br>')
    .replace(/<\/?span[^>]*>/g, '')
    .replace(/<\/?p[^>]*>/g, '')
    .replace(/<\/?font[^>]*>/g, '')
    .replace(/<b><\/b>/g, '')
    .trim();
};

// Helper to get image path for solution
const solutionUrl = (testNumber, questionNumber, sectionNumber) => {
  return `https://www.time4education.com/moodle/aimcatsolutions/images/AIMCAT${testNumber}/Section-${sectionNumber}/Q${questionNumber}S.gif`;
};

function Question({
  activeSection,
  questionData,
  initialShowSolution,
}) {
  const sectionNumberMap = {
    VARC: '1',
    DILR: '2',
    QA: '3',
  };
  const sectionNumber = sectionNumberMap[activeSection] || '0'; // Map section to number
  const questionNumber = questionData.qKey.replace('qu', ''); // Assuming index is passed in questionData

  // Adapt to new data structure
  const {
    questionText, // HTML string
    options = [], // Array, may be empty for FILLN
    pattern, // e.g., "FILLN"
    correctAnswer,
    status,
    essay,
    tno,
  } = questionData;

  const [showAnswer, setShowAnswer] = useState(false);
  const [showSolution, setShowSolution] = useState(initialShowSolution);

  // For FILLN, user types a number; for MCQ, show options
  const isFillType = pattern === 'FILLN' || options.length === 0;

  const statusMap = {
    CORRECT: {
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50/70',
      label: 'Correct',
    },
    WRONG: {
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50/70',
      label: 'Wrong',
    },
    SKIPPED: {
      icon: MinusCircle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50/70',
      label: 'Skipped',
    },
  };

  const { icon: Icon, color, bg, label } = statusMap[status];

  return (
    <div className='question-container'>
      <div className={essay !== ' ' ? 'question-grid-1' : 'question-grid-2'}>
        <div className='question-text'>
          <strong>
            Question {questionData.tno} - {questionData.qKey.toUpperCase()}:
          </strong>
          <Icon
            className={`inline ml-20 mb-10 ${color}`}
            size={18}
            title={label}
          />
          <div
            dangerouslySetInnerHTML={{ __html: cleanHtmlString(essay) }}
          ></div>
        </div>

        <div>
          <div
            dangerouslySetInnerHTML={{ __html: cleanHtmlString(questionText) }}
          ></div>
          {isFillType ? (
            <div className='input-container'>
              <input
                type='number'
                className='answer-input'
                placeholder='Type your answer here...'
              />
            </div>
          ) : (
            <div className='options-container'>
              {options.map((optionText, idx) => (
                <div key={idx}>
                  <input
                    type='radio'
                    id={`q${questionNumber}-opt${idx + 1}`}
                    name={`question-${questionNumber}`}
                    value={idx + 1}
                  />
                  <label
                    htmlFor={`q${questionNumber}-opt${idx + 1}`}
                    dangerouslySetInnerHTML={{
                      __html: cleanHtmlString(optionText),
                    }}
                  ></label>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className='answer-section'>
        <button
          className='show-answer-button'
          onClick={() => setShowAnswer(!showAnswer)}
        >
          {showAnswer ? 'Hide Answer' : 'Show Answer'}
        </button>
        <button
          className='show-answer-button'
          onClick={() => setShowSolution(!showSolution)}
        >
          {showSolution ? 'Hide Solution' : 'Show Solution'}
        </button>
        {showAnswer && (
          <div className='correct-answer-display'>
            <strong>Correct Answer: </strong>
            <span className='answer-text'>
              {isFillType ? correctAnswer : `Option ${correctAnswer}`}
            </span>
          </div>
        )}

        {showSolution && (
          <div className='correct-answer-display'>
            <img
              src={solutionUrl(tno, questionNumber, sectionNumber)}
              alt={`Solution for Question ${questionNumber}`}
              style={{
                maxWidth: '100%',
                marginTop: '10px',
                borderRadius: '8px',
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default Question;
