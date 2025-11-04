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
