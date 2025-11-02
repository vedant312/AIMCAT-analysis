import requests
import json
import time
import os

def extract_answer_keys():
    """
    Fetches JSON data from a range of localhost URLs and aggregates the data 
    into section-specific files, separating the raw paper content from the 
    extracted answer keys.

    The URL template is: https://www.time4education.com/moodle/aimcatsolutions/json/{number}_{section}.txt
    The number ranges from 2625 down to 2603.
    The sections are VARC, DILR, and QA.

    Output Files (6 total):
    - varc_papers.json, dilr_papers.json, qa_papers.json (contain raw JSON)
    - varc_answers.json, dilr_answers.json, qa_answers.json (contain only extracted answers)
    """
    
    # Configuration
    base_url_template = "https://www.time4education.com/moodle/aimcatsolutions/json/{number}_{section}.txt"
    start_number = 2625
    end_number = 2603  # Inclusive
    sections = ["VARC", "DILR", "QA"]
    
    # Aggregation Dictionaries for the new file structure
    all_raw_papers = {s: {} for s in sections}
    all_answer_keys = {s: {} for s in sections}
    
    # Counters
    total_answers_extracted = 0
    total_files_processed = 0
    
    # Iterate through the number range (2625 down to 2603)
    for num in range(start_number, end_number - 1, -1):
        for section in sections:
            total_files_processed += 1
            url = base_url_template.format(number=num, section=section)
            print(f"--- Attempting to fetch: {url} (File {total_files_processed}) ---")
            
            try:
                # 1. Fetch the data
                response = requests.get(url, timeout=5)
                
                if response.status_code == 200:
                    try:
                        # 2. Parse the JSON data
                        data = response.json()
                        
                        # Unique identifier for the current paper in the aggregated files (e.g., "2625_VARC")
                        paper_id = f"{num}_{section}"
                        
                        # --- 3a. Store Raw Paper Data ---
                        all_raw_papers[section][paper_id] = data
                        
                        # --- 3b. Extract Answers for Answer Key ---
                        current_answer_key = {}
                        # Get all question keys (qu1, qu2, ...) and sort them numerically
                        question_keys = sorted([k for k in data.keys() if k.startswith('qu')])
                        
                        for q_key in question_keys:
                            try:
                                # Extract the CORRECT_ANSWER from the ENGLISH section
                                answer = data[q_key]["ENGLISH"]["CORRECT_ANSWER"]
                                current_answer_key[q_key] = str(answer)
                                total_answers_extracted += 1
                                
                            except KeyError:
                                # Log error for questions missing the required structure
                                print(f"  [WARN] Question {q_key} in {url} is missing the 'ENGLISH' or 'CORRECT_ANSWER' key and was skipped.")
                        
                        # --- 3c. Store Answer Key Data ---
                        all_answer_keys[section][paper_id] = current_answer_key

                        print(f"  [SUCCESS] Data for {paper_id} aggregated.")
                                
                    except json.JSONDecodeError:
                        print(f"  [ERROR] Failed to decode JSON from {url}. The file might not be valid JSON.")
                    
                else:
                    print(f"  [WARNING] Could not fetch {url}. Status Code: {response.status_code}")
                    
            except requests.exceptions.RequestException as e:
                # Catch connection, timeout, or DNS errors
                print(f"  [ERROR] Request failed for {url}. Error: {e}")
            
            # Brief pause to be respectful to the local server
            time.sleep(0.1) 

    # --- 4. Save Aggregated Data to Final Files ---
    total_output_files_saved = 0
    print("\n" + "="*80)
    print("Saving aggregated data to final section-wise files...")
    
    for section in sections:
        section_lower = section.lower()
        
        # Save Papers file
        papers_filename = f"{section_lower}_papers.json"
        with open(papers_filename, 'w', encoding='utf-8') as f:
            json.dump(all_raw_papers[section], f, indent=4)
        print(f"  [SAVED] All raw {section} papers saved to {papers_filename} ({len(all_raw_papers[section])} papers)")
        total_output_files_saved += 1

        # Save Answers file
        answers_filename = f"{section_lower}_answers.json"
        with open(answers_filename, 'w', encoding='utf-8') as f:
            json.dump(all_answer_keys[section], f, indent=4)
        print(f"  [SAVED] All {section} answer keys saved to {answers_filename} ({len(all_answer_keys[section])} keys)")
        total_output_files_saved += 1
        
    # Final summary
    print("\n" + "="*80)
    print("Data Extraction and Aggregation Complete.")
    print(f"Total URL attempts: {total_files_processed}")
    print(f"Total individual answers extracted: {total_answers_extracted}")
    print(f"Total aggregated output files saved: {total_output_files_saved}")
    print("Output files: varc_papers.json, varc_answers.json, dilr_papers.json, dilr_answers.json, qa_papers.json, qa_answers.json.")
    print("="*80)

if __name__ == "__main__":
    # Note: Ensure you have the 'requests' library installed: pip install requests
    extract_answer_keys()
