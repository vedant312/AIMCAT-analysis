import requests
import json
import time
import os

def extract_answer_strings():
    """
    Fetches raw answer strings from the get_ansstr.asp endpoint for a range 
    of test numbers and sections. It then processes the semicolon-separated 
    string into a structured dictionary (qu1: answer1, qu2: answer2, etc.)
    and saves all results into a single JSON file.
    """
    
    # Configuration for the new API endpoint
    base_url_template = "https://www.time4education.com/moodle/aimcatsolutions/get_ansstr.asp?tno={number}&area={section}&id=DRCBB5A186"
    start_number = 2625
    end_number = 2601  # Inclusive
    sections = ["VARC", "DILR", "QA"]
    output_filename = "ishani_response.json"
    
    # Aggregation Dictionary
    all_responses = {}
    
    # Counters
    total_files_processed = 0
    total_successful_fetches = 0
    
    print("--- Starting Answer String Extraction ---")
    
    # Iterate through the number range (2625 down to 2601)
    for num in range(start_number, end_number - 1, -1):
        for section in sections:
            total_files_processed += 1
            url = base_url_template.format(number=num, section=section)
            key_id = f"{num}_{section}"
            print(f"Attempting to fetch {key_id} (File {total_files_processed})...")
            
            try:
                # 1. Fetch the data (expecting a raw text string)
                response = requests.get(url, timeout=5)
                
                if response.status_code == 200 and response.text.strip():
                    raw_ans_string = response.text.strip()
                    
                    # 2. Process the response string
                    # Split by ';' and filter out the final empty string if a trailing ';' exists
                    answers_list = [a for a in raw_ans_string.split(';') if a] 
                    
                    if not answers_list:
                        print(f"  [WARN] {key_id}: Received an empty or malformed answer string.")
                        continue
                        
                    # 3. Map answers to qu1, qu2, ...
                    structured_answers = {}
                    for i, answer in enumerate(answers_list, 1):
                        structured_answers[f"qu{i}"] = answer
                        
                    # 4. Store the result in the main aggregation dictionary
                    all_responses[key_id] = structured_answers
                    total_successful_fetches += 1
                    
                    print(f"  [SUCCESS] {key_id}: Extracted {len(answers_list)} answers.")
                                
                else:
                    print(f"  [WARNING] Could not fetch {key_id}. Status Code: {response.status_code} or empty response.")
                    
            except requests.exceptions.RequestException as e:
                # Catch connection, timeout, or DNS errors
                print(f"  [ERROR] Request failed for {key_id}. Error: {e}")
            
            # Brief pause
            time.sleep(0.1) 

    # --- 5. Save Aggregated Data to Final File ---
    print("\n" + "="*80)
    print(f"Saving aggregated data to {output_filename}...")
    
    try:
        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(all_responses, f, indent=4)
        
        print(f"  [SAVED] Successfully saved data for {total_successful_fetches} files to {output_filename}.")
    except IOError as e:
        print(f"  [CRITICAL ERROR] Could not write to {output_filename}. Error: {e}")
        
    # Final summary
    print("\n" + "="*80)
    print("Data Extraction Complete.")
    print(f"Total URL attempts: {total_files_processed}")
    print(f"Final output file: {output_filename}")
    print("="*80)

if __name__ == "__main__":
    # Note: Ensure you have the 'requests' library installed: pip install requests
    extract_answer_strings()
