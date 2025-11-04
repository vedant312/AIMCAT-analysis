import os
import json
import re
from bs4 import BeautifulSoup
from pathlib import Path

def extract_difficulty(text):
    """Extract difficulty level from text"""
    if '/E' in text:
        return 'E'
    elif '/M' in text:
        return 'M'
    elif '/D' in text:
        return 'D'
    elif '/VD' in text:
        return 'VD'
    return None

def extract_question_number(text):
    """Extract question number from text"""
    # Pattern: number/difficulty (e.g., "2/D", "10/M")
    match = re.search(r'(\d+)/[A-Z]+', text)
    if match:
        return int(match.group(1))
    return None

def process_section(soup, section_name):
    """Process a section (VA/RC, DI/LR, or QA) and extract question data"""
    section_data = {}
    
    # Find the section heading
    section_heading = soup.find('div', class_='sub-area-heading', string=section_name)
    if not section_heading:
        return section_data
    
    # Find the table after this heading
    table = section_heading.find_next('table', class_='table-bordered')
    if not table:
        return section_data
    
    # Process each row in tbody
    for tbody in table.find_all('tbody'):
        row = tbody.find('tr')
        if not row:
            continue
        
        # Get subarea name
        subarea_cell = row.find('th', class_='aim-left')
        if not subarea_cell:
            continue
        subarea = subarea_cell.get_text(strip=True)
        
        # Find all question cells (attempted and left out)
        question_cells = row.find_all('td', class_='aim-white')
        
        for cell in question_cells:
            # Find all spans with box-green or box-red (these contain questions)
            question_spans = cell.find_all('span', class_=['box-green', 'box-red'])
            
            for span in question_spans:
                # Get the text which contains question number and difficulty
                text = span.get_text(strip=True)
                
                question_num = extract_question_number(text)
                difficulty = extract_difficulty(text)
                
                if question_num and difficulty:
                    section_data[f'qu{question_num}'] = {
                        'subsection': subarea,
                        'difficulty': difficulty
                    }
    
    return section_data

def sort_and_renumber_questions(section_data):
    """Sort questions by their original number and renumber starting from 1"""
    if not section_data:
        return {}
    
    # Extract question numbers and sort
    questions = []
    for key, value in section_data.items():
        # Extract original question number from key (e.g., "qu2" -> 2)
        original_num = int(key[2:])
        questions.append((original_num, value))
    
    # Sort by original question number
    questions.sort(key=lambda x: x[0])
    
    # Renumber starting from 1
    renumbered = {}
    for new_num, (original_num, data) in enumerate(questions, start=1):
        renumbered[f'qu{new_num}'] = data
    
    return renumbered

def process_html_file(file_path):
    """Process a single HTML file and extract data for all sections"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    soup = BeautifulSoup(content, 'html.parser')
    
    # Extract file number from filename (e.g., 2619 from "2619.html")
    file_number = Path(file_path).stem
    
    result = {}
    
    # Process each section
    varc_data = process_section(soup, 'VA/RC')
    if varc_data:
        result[f'{file_number}_varc'] = sort_and_renumber_questions(varc_data)
    
    dilr_data = process_section(soup, 'DI/LR')
    if dilr_data:
        result[f'{file_number}_dilr'] = sort_and_renumber_questions(dilr_data)
    
    qa_data = process_section(soup, 'QA')
    if qa_data:
        result[f'{file_number}_qa'] = sort_and_renumber_questions(qa_data)
    
    return result

def main():
    """Main function to process all HTML files from 2625 to 2501"""
    all_data = {}
    
    # Process files from 2625 down to 2501
    for file_num in {2615}:
        file_path = f'D:/AIMCAT/aimcat-dashboard/src/{file_num}.html'
        if os.path.exists(file_path):
            print(f'Processing {file_path}...')
            try:
                file_data = process_html_file(file_path)
                all_data.update(file_data)
                print(f'  ✓ Extracted data for {len(file_data)} sections')
            except Exception as e:
                print(f'  ✗ Error processing {file_path}: {e}')
        else:
            print(f'  - File {file_path} not found, skipping...')
    
    # Save to JSON file
    output_file = 'questions_data_extra.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, indent=2, ensure_ascii=False)
    
    print(f'\n✓ Data saved to {output_file}')
    print(f'  Total sections processed: {len(all_data)}')
    
    # Print summary
    total_questions = sum(len(section_data) for section_data in all_data.values())
    print(f'  Total questions extracted: {total_questions}')

if __name__ == '__main__':
    main()