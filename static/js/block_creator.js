// DOM Elements
const blockCreatorForm = document.getElementById('block-creator-form');
const blockInputsContainer = document.getElementById('block-inputs-container');
const previewContainer = document.getElementById('preview-container');
const addInputBtn = document.querySelector('.add-input-btn');
const previewBtn = document.querySelector('.preview-block-btn');

// Block templates
const blockTemplates = {
    action: {
        svg: `<svg class="block-svg" viewBox="0 0 130 50" fill="none">
            <path d="M3 42.0001C1.89543 42.0001 1 41.1046 1 40.0001V3.00001C1 1.89544 1.89544 1 3.00001 1.00001L11.2117 1.00006C11.7183 1.00006 12.206 1.1923 12.5763 1.53795L18.9237 7.46217C19.294 7.80782 19.7817 8.00006 20.2883 8.00006H31.6716C32.202 8.00006 32.7107 7.78935 33.0858 7.41427L38.9142 1.58585C39.2893 1.21077 39.798 1.00006 40.3284 1.00006L127 1C128.105 1 129 1.89543 129 3V40.0001C129 41.1046 128.105 42.0001 127 42.0001H3Z" fill="CURRENT_COLOR" stroke="CURRENT_STROKE"/>
        </svg>`,
        class: 'blue-block'
    },
    condition: {
        svg: `<svg class="block-svg" viewBox="0 0 47 13" fill="none">
            <path d="M0.703617 6.5L6.64425 0.5H40.5462L46.3069 6.5L40.5462 12.5H6.64425L0.703617 6.5Z" fill="CURRENT_COLOR" stroke="CURRENT_STROKE"/>
        </svg>`,
        class: 'boolean-block'
    },
    loop: {
        svg: `<svg class="block-svg" viewBox="0 0 130 115" fill="none">
            <path d="M1 42.0001V3.00001C1 1.89544 1.89544 1 3.00001 1.00001L11.2117 1.00006C11.7183 1.00006 12.206 1.1923 12.5763 1.53795L18.9237 7.46217C19.294 7.80782 19.7817 8.00006 20.2883 8.00006H31.6716C32.202 8.00006 32.7107 7.78935 33.0858 7.41427L38.9142 1.58585C39.2893 1.21077 39.798 1.00006 40.3284 1.00006L127 1C128.105 1 129 1.89543 129 3V40.0001C129 41.1046 128.105 42.0001 127 42.0001H54.3284C53.798 42.0001 53.2893 42.2108 52.9142 42.5858L47.0858 48.4143C46.7107 48.7893 46.202 49.0001 45.6716 49.0001H34.2883C33.7817 49.0001 33.294 48.8078 32.9237 48.4622L26.5763 42.538C26.206 42.1923 25.7183 42.0001 25.2117 42.0001H14C12.8954 42.0001 12 42.8955 12 44.0001V64C12 65.1046 12.8954 66 14 66L25.2117 66.0001C25.7183 66.0001 26.206 66.1923 26.5763 66.5379L32.9237 72.4622C33.294 72.8078 33.7817 73.0001 34.2883 73.0001H45.6716C46.202 73.0001 46.7107 72.7893 47.0858 72.4143L52.9142 66.5858C53.2893 66.2108 53.798 66.0001 54.3284 66.0001L127 66C128.105 66 129 66.8954 129 68V105C129 106.105 128.105 107 127 107H3C1.89543 107 1 106.105 1 105V66V42.0001Z" fill="CURRENT_COLOR" stroke="CURRENT_STROKE"/>
        </svg>`,
        class: 'yellow-block loop-block'
    }
};

// Initialize page
function initBlockCreator() {
    // Add input button handler
    addInputBtn.addEventListener('click', () => addBlockInput());
    
    // Preview button handler
    previewBtn.addEventListener('click', previewBlock);
    
    // Form submission handler
    blockCreatorForm.addEventListener('submit', handleBlockCreatorSubmit);
}

// Add new input field
function addBlockInput() {
    const inputGroup = document.createElement('div');
    inputGroup.className = 'block-input';
    inputGroup.innerHTML = `
        <input type="text" placeholder="Название параметра" required>
        <select required>
            <option value="text">Текст</option>
            <option value="number">Число</option>
            <option value="boolean">Логическое</option>
        </select>
        <button type="button" class="remove-input-btn">×</button>
    `;
    
    inputGroup.querySelector('.remove-input-btn').addEventListener('click', () => {
        inputGroup.remove();
    });
    
    blockInputsContainer.insertBefore(inputGroup, addInputBtn);
}

// Preview block
function previewBlock() {
    const formData = getFormData();
    if (!formData) return;
    
    const { name, type, color, inputs } = formData;
    const template = blockTemplates[type];
    
    // Create preview block
    const block = document.createElement('div');
    block.className = `block ${template.class}`;
    block.innerHTML = template.svg
        .replace('CURRENT_COLOR', color)
        .replace('CURRENT_STROKE', adjustColor(color, -20));
    
    // Add block text
    const textDiv = document.createElement('div');
    textDiv.className = 'block_text';
    textDiv.textContent = name;
    
    // Add inputs if any
    if (inputs.length > 0) {
        inputs.forEach(input => {
            const inputSpan = document.createElement('span');
            inputSpan.className = 'input-container';
            inputSpan.innerHTML = `
                <input type="text" class="block-input" value="${input.name}" readonly>
            `;
            textDiv.appendChild(inputSpan);
        });
    }
    
    block.appendChild(textDiv);
    
    // Show preview
    previewContainer.innerHTML = '';
    previewContainer.appendChild(block);
}

// Handle form submission
function handleBlockCreatorSubmit(e) {
    e.preventDefault();
    
    const formData = getFormData();
    if (!formData) return;
    
    // Save block to localStorage
    const customBlocks = JSON.parse(localStorage.getItem('customBlocks')) || [];
    customBlocks.push(formData);
    localStorage.setItem('customBlocks', JSON.stringify(customBlocks));
    
    // Show success message
    alert('Блок успешно сохранен!');
    
    // Reset form
    blockCreatorForm.reset();
    blockInputsContainer.innerHTML = '<button type="button" class="add-input-btn">Добавить параметр</button>';
    previewContainer.innerHTML = '';
}

// Get form data
function getFormData() {
    const name = document.getElementById('block-name').value;
    const category = document.getElementById('block-category').value;
    const type = document.getElementById('block-type').value;
    const color = document.getElementById('block-color').value;
    
    if (!name || !category || !type || !color) {
        alert('Пожалуйста, заполните все обязательные поля');
        return null;
    }
    
    const inputs = Array.from(blockInputsContainer.querySelectorAll('.block-input')).map(group => {
        const input = group.querySelector('input');
        const select = group.querySelector('select');
        return {
            name: input.value,
            type: select.value
        };
    });
    
    return {
        name,
        category,
        type,
        color,
        inputs
    };
}

// Helper function to adjust color brightness
function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', initBlockCreator); 