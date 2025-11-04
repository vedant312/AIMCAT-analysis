import requests
import json
import re
from bs4 import BeautifulSoup
from typing import Dict, List, Tuple

def extract_question_data(html_content: str) -> Dict[str, Dict[str, Tuple[str, str]]]:
    """
    Extract subsection and difficulty for each question from HTML content.
    Returns a dictionary with keys: varc, dilr, qa
    Each containing question mappings like {qu1: (subsection, difficulty), ...}
    """
    soup = BeautifulSoup(html_content, 'html.parser')
    
    result = {
        'varc': {},
        'dilr': {},
        'qa': {}
    }
    
    # Section mapping based on the HTML structure
    section_mapping = {
        'VA/RC': 'varc',
        'DI/LR': 'dilr',
        'QA': 'qa'
    }
    
    current_section = None
    
    # Find all elements in the document
    # Look for div with class="sub-area-heading" that contains section names
    all_elements = soup.find_all(['div', 'table', 'th', 'td', 'tbody'])
    
    for i, element in enumerate(all_elements):
        # Check if this is a section heading
        if element.name == 'div' and 'sub-area-heading' in element.get('class', []):
            heading_text = element.get_text(strip=True)
            
            # Check if this is a main section heading
            if heading_text in section_mapping:
                current_section = section_mapping[heading_text]
                print(f"    Found section: {heading_text}")
                continue
        
        # If we're in a section and this is a table row with subarea
        if current_section and element.name == 'th' and 'aim-left' in element.get('class', []):
            subarea = element.get_text(strip=True)
            print(f"      Subarea: {subarea}")

            
            # Get the parent row
            row = element.find_parent('tr')
            print(f"      Processing row for subarea: {subarea}, current_section: {row}")
            if not row:
                continue
            
            # Find all spans with box-green or box-red in this row
            spans = row.find_all('span', class_=['box-green', 'box-red'])
            
            for span in spans:
                link = span.find('a')
                if link:
                    # Extract question number and difficulty
                    text = link.get_text(strip=True)
                    # Pattern: number/difficulty (e.g., "1/VD", "4/D", "11/M")
                    # Handle both with and without spaces
                    match = re.search(r'(\d+)\s*/\s*(VD|D|M|E)', text)
                    if match:
                        q_num = int(match.group(1))
                        difficulty = match.group(2)
                        
                        # Map difficulty codes
                        difficulty_map = {
                            'VD': 'Very Difficult',
                            'D': 'Difficult',
                            'M': 'Moderately Easy',
                            'E': 'Easy'
                        }
                        
                        difficulty_full = difficulty_map.get(difficulty, difficulty)
                        
                        # Store in result
                        qu_key = f'qu{q_num}'
                        result[current_section][qu_key] = [subarea, difficulty_full]
    
    return result

def fetch_aimcat_data(test_number: int, base_url: str = "http://localhost/") -> Dict:
    """
    Fetch AIMCAT data for a given test number.
    """
    try:
        url = base_url
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        return extract_question_data(response.text)
    except requests.exceptions.RequestException as e:
        print(f"Error fetching test {test_number}: {e}")
        return None

def get_section_stats(section_data: Dict) -> str:
    """
    Get statistics about a section for logging.
    """
    if not section_data:
        return "No questions"
    
    q_nums = [int(q.replace('qu', '')) for q in section_data.keys()]
    return f"{len(q_nums)} questions (Q{min(q_nums)}-Q{max(q_nums)})"

def main():
    """
    Main function to scrape data from tests 2625 to 2601.
    """
    base_url = "https://www.time4education.com/moodle/aimcatresults/subareawise_performance.asp?idcardno=565B482B565B483D565B482C565B482E565B482D565B485A565B482E565B485C565B485D565B4856565B48&testno=565B485D565B4859565B485F565B485B565B48"
    all_data = {}
    
    # Iterate from 2625 to 2601
    for test_num in range(2625, 2624, -1):
        print(f"\nFetching data for AIMCAT {test_num}...")
        
        data = fetch_aimcat_data(test_num, base_url)
        
        if data:
            # Store with keys like "2625_varc", "2625_dilr", "2625_qa"
            all_data[f"{test_num}_varc"] = data['varc']
            all_data[f"{test_num}_dilr"] = data['dilr']
            all_data[f"{test_num}_qa"] = data['qa']
            
            # Print statistics for each section
            print(f"  VA/RC: {get_section_stats(data['varc'])}")
            print(f"  DI/LR: {get_section_stats(data['dilr'])}")
            print(f"  QA:    {get_section_stats(data['qa'])}")
            print(f"  ✓ Successfully extracted data for AIMCAT {test_num}")
        else:
            print(f"  ✗ Failed to extract data for AIMCAT {test_num}")
    
    # Save to JSON file
    output_file = "aimcat_data.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n{'='*60}")
    print(f"✓ Data saved to {output_file}")
    print(f"Total tests processed: {len(all_data) // 3}")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()