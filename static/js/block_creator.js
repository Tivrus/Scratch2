// DOM элементы
const blockCreatorForm = document.getElementById('block-creator-form');
const blockInputsContainer = document.getElementById('block-inputs-container');
const previewContainer = document.getElementById('preview-container');
const addInputBtn = document.querySelector('.add-input-btn');
const previewBlockBtn = document.querySelector('.preview-block-btn');
const blockColorInput = document.getElementById('block-color');
const colorPreview = document.getElementById('color-preview');
const blockLogicEditor = document.getElementById('block-logic');
const logicTypeBtns = document.querySelectorAll('.logic-type-btn');
const shapeOptions = document.querySelectorAll('.shape-option');
const categorySelect = document.getElementById('block-category');
const addCategoryBtn = document.getElementById('add-category-btn');
const categoryModal = document.getElementById('category-modal');
const categoryForm = document.getElementById('category-form');
const closeModalBtn = document.querySelector('.close-modal-btn');
const cancelCategoryBtn = document.querySelector('.cancel-category-btn');
const categoryColorInput = document.getElementById('category-color');
const categoryColorPreview = document.getElementById('category-color-preview');

// Шаблоны блоков
const blockTemplates = {
    action: {
        svg: `<svg viewBox="0 0 130 50" fill="none">
            <path d="M3 42.0001C1.89543 42.0001 1 41.1046 1 40.0001V3.00001C1 1.89544 1.89544 1 3.00001 1.00001L11.2117 1.00006C11.7183 1.00006 12.206 1.1923 12.5763 1.53795L18.9237 7.46217C19.294 7.80782 19.7817 8.00006 20.2883 8.00006H31.6716C32.202 8.00006 32.7107 7.78935 33.0858 7.41427L38.9142 1.58585C39.2893 1.21077 39.798 1.00006 40.3284 1.00006L127 1C128.105 1 129 1.89543 129 3V40.0001C129 41.1046 128.105 42.0001 127 42.0001H3Z" fill="{color}" stroke="{strokeColor}"/>
            <text x="65" y="25" text-anchor="middle" fill="white" font-family="Roboto" font-size="14">{text}</text>
        </svg>`,
        class: 'block-action'
    },
    condition: {
        svg: `<svg viewBox="0 0 47 13" fill="none">
            <path d="M0.703617 6.5L6.64425 0.5H40.5462L46.3069 6.5L40.5462 12.5H6.64425L0.703617 6.5Z" fill="{color}" stroke="{strokeColor}"/>
            <text x="23.5" y="8" text-anchor="middle" fill="white" font-family="Roboto" font-size="10">{text}</text>
        </svg>`,
        class: 'block-condition'
    },
    loop: {
        svg: `<svg viewBox="0 0 130 115" fill="none">
            <path d="M1 42.0001V3.00001C1 1.89544 1.89544 1 3.00001 1.00001L11.2117 1.00006C11.7183 1.00006 12.206 1.1923 12.5763 1.53795L18.9237 7.46217C19.294 7.80782 19.7817 8.00006 20.2883 8.00006H31.6716C32.202 8.00006 32.7107 7.78935 33.0858 7.41427L38.9142 1.58585C39.2893 1.21077 39.798 1.00006 40.3284 1.00006L127 1C128.105 1 129 1.89543 129 3V40.0001C129 41.1046 128.105 42.0001 127 42.0001H54.3284C53.798 42.0001 53.2893 42.2108 52.9142 42.5858L47.0858 48.4143C46.7107 48.7893 46.202 49.0001 45.6716 49.0001H34.2883C33.7817 49.0001 33.294 48.8078 32.9237 48.4622L26.5763 42.538C26.206 42.1923 25.7183 42.0001 25.2117 42.0001H14C12.8954 42.0001 12 42.8955 12 44.0001V64C12 65.1046 12.8954 66 14 66L25.2117 66.0001C25.7183 66.0001 26.206 66.1923 26.5763 66.5379L32.9237 72.4622C33.294 72.8078 33.7817 73.0001 34.2883 73.0001H45.6716C46.202 73.0001 46.7107 72.7893 47.0858 72.4143L52.9142 66.5858C53.2893 66.2108 53.798 66.0001 54.3284 66.0001L127 66C128.105 66 129 66.8954 129 68V105C129 106.105 128.105 107 127 107H3C1.89543 107 1 106.105 1 105V66V42.0001Z" fill="{color}" stroke="{strokeColor}"/>
            <text x="65" y="25" text-anchor="middle" fill="white" font-family="Roboto" font-size="14">{text}</text>
        </svg>`,
        class: 'block-loop'
    }
};

// Загрузка пользовательских категорий
function loadCustomCategories() {
    const customCategories = JSON.parse(localStorage.getItem('customCategories') || '[]');
    
    // Удаляем все пользовательские категории из селекта
    const customOptions = categorySelect.querySelectorAll('.custom-category');
    customOptions.forEach(option => option.remove());
    
    // Добавляем пользовательские категории
    customCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.className = 'custom-category';
        option.innerHTML = `
            <div class="custom-category-option">
                <span class="category-color-dot" style="background-color: ${category.color}"></span>
                ${category.name}
            </div>
        `;
        categorySelect.appendChild(option);
    });
}

// Инициализация страницы
function initBlockCreator() {
    // Обработчики событий для формы
    addInputBtn.addEventListener('click', addBlockInput);
    previewBlockBtn.addEventListener('click', updatePreview);
    blockCreatorForm.addEventListener('submit', handleBlockCreatorSubmit);
    
    // Обработчик изменения цвета
    blockColorInput.addEventListener('input', updateColorPreview);
    
    // Обработчики для выбора формы блока
    shapeOptions.forEach(option => {
        option.addEventListener('click', () => {
            shapeOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            updatePreview();
        });
    });
    
    // Обработчики для переключения языка программирования
    logicTypeBtns.forEach(btn => {
        btn.addEventListener('click', handleLogicTypeChange);
    });
    
    // Обработчики для модального окна категорий
    addCategoryBtn.addEventListener('click', () => {
        categoryModal.classList.add('show');
        categoryForm.reset();
        updateCategoryColorPreview();
    });
    
    closeModalBtn.addEventListener('click', () => {
        categoryModal.classList.remove('show');
    });
    
    cancelCategoryBtn.addEventListener('click', () => {
        categoryModal.classList.remove('show');
    });
    
    categoryModal.addEventListener('click', (e) => {
        if (e.target === categoryModal) {
            categoryModal.classList.remove('show');
        }
    });
    
    categoryColorInput.addEventListener('input', updateCategoryColorPreview);
    
    categoryForm.addEventListener('submit', handleCategorySubmit);
    
    // Инициализация предпросмотра цвета
    updateColorPreview();
    updateCategoryColorPreview();
    
    // Загрузка пользовательских категорий
    loadCustomCategories();
    
    // Добавляем первый параметр по умолчанию
    addBlockInput();
    
    // Добавляем обработчики для обновления предпросмотра при изменении формы
    const formInputs = document.querySelectorAll('#block-creator-form input, #block-creator-form select, #block-creator-form textarea');
    formInputs.forEach(input => {
        input.addEventListener('change', updatePreview);
        if (input.type === 'text' || input.type === 'number') {
            input.addEventListener('input', debounce(updatePreview, 300));
        }
    });
    
    // Инициализируем предпросмотр
    updatePreview();
}

// Добавление нового входного параметра
function addBlockInput() {
    const inputsContainer = document.getElementById('block-inputs-container');
    const inputCount = inputsContainer.children.length;
    const newInputDiv = document.createElement('div');
    newInputDiv.classList.add('input-parameter');
    newInputDiv.innerHTML = `
        <div class="param-group">
            <label for="param-name-${inputCount}">Имя параметра:</label>
            <input type="text" id="param-name-${inputCount}" class="param-name" placeholder="Например: steps">
        </div>
        <div class="param-group">
            <label for="param-type-${inputCount}">Тип:</label>
            <select id="param-type-${inputCount}" class="param-type">
                <option value="number">Число</option>
                <option value="string">Строка</option>
                <option value="boolean">Логический</option>
                <option value="dropdown">Выпадающий список</option>
            </select>
        </div>
        <div class="param-group">
             <label for="param-default-${inputCount}">Значение по умолчанию:</label>
             <input type="text" id="param-default-${inputCount}" class="param-default" placeholder="Необязательно">
        </div>
        <button type="button" class="remove-input-btn" aria-label="Удалить параметр">&times;</button>
    `;
    inputsContainer.appendChild(newInputDiv);

    // Add event listener to the new remove button
    newInputDiv.querySelector('.remove-input-btn').addEventListener('click', function() {
        newInputDiv.remove();
    });
}

// Обновление предпросмотра цвета
function updateColorPreview() {
    const color = blockColorInput.value;
    colorPreview.style.backgroundColor = color;
    colorPreview.style.borderColor = adjustColor(color, -20);
    updatePreview();
}

// Обновление предпросмотра цвета категории
function updateCategoryColorPreview() {
    const color = categoryColorInput.value;
    categoryColorPreview.style.backgroundColor = color;
    categoryColorPreview.style.borderColor = adjustColor(color, -20);
}

// Обновление предпросмотра блока
function updatePreview() {
    const formData = getFormData();
    if (!formData) return;
    
    const selectedShape = document.querySelector('.shape-option.selected').dataset.shape;
    const template = blockTemplates[selectedShape];
    
    // Создаем SVG блока
    const blockSvg = template.svg
        .replace('{color}', formData.color)
        .replace('{strokeColor}', adjustColor(formData.color, -20))
        .replace('{text}', formData.name);
    
    // Создаем HTML для предпросмотра
    const previewHtml = `
        <div class="block-preview-item ${template.class}">
            ${blockSvg}
            ${formData.inputs.length > 0 ? `
                <div class="block-inputs">
                    ${formData.inputs.map(input => `
                        <div class="block-input">
                            <span class="input-label">${input.name}</span>
                            <span class="input-value">${input.default || ''}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
    
    previewContainer.innerHTML = previewHtml;
    
    // Обновляем документацию
    updateDocumentation(formData);
}

// Обновление документации блока
function updateDocumentation(formData) {
    const description = document.querySelector('.block-description');
    const parametersList = document.getElementById('parameters-list');
    
    // Обновляем описание
    description.textContent = `Блок "${formData.name}" выполняет действие в категории "${getCategoryName(formData.category)}".`;
    
    // Обновляем список параметров
    parametersList.innerHTML = formData.inputs.map(input => `
        <li>
            <div class="parameter-info">
                <span class="parameter-name">${input.name}</span>
                <span class="parameter-type">${getParameterTypeName(input.type)}</span>
            </div>
            ${input.default ? `<span class="parameter-default">По умолчанию: ${input.default}</span>` : ''}
        </li>
    `).join('');
}

// Получение названия категории
function getCategoryName(categoryId) {
    const categorySelect = document.getElementById('block-category');
    const option = categorySelect.querySelector(`option[value="${categoryId}"]`);
    return option ? option.textContent : categoryId;
}

// Получение названия типа параметра
function getParameterTypeName(type) {
    const types = {
        'number': 'Число',
        'string': 'Текст',
        'boolean': 'Логическое значение',
        'color': 'Цвет',
        'dropdown': 'Выбор из списка'
    };
    return types[type] || type;
}

// Обработка изменения типа логики
function handleLogicTypeChange(event) {
    const buttons = document.querySelectorAll('.logic-type-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Обновляем плейсхолдер в зависимости от выбранного языка
    const editor = document.getElementById('block-logic');
    const language = event.target.dataset.type;
    
    if (language === 'python') {
        editor.placeholder = `# Введите код для выполнения блока
# Доступные переменные:
# - inputs: словарь с входными параметрами
# - context: контекст выполнения
# - result: для возврата результата

def execute(inputs, context):
    # Ваш код здесь
    pass`;
    } else {
        editor.placeholder = `// Введите код для выполнения блока
// Доступные переменные:
// - inputs: объект с входными параметрами
// - context: контекст выполнения
// - result: для возврата результата

function execute(inputs, context) {
    // Ваш код здесь
}`;
    }
}

// Обработка отправки формы
function handleBlockCreatorSubmit(event) {
    event.preventDefault();
    
    const formData = getFormData();
    if (!formData) return;
    
    // Получаем текущий язык программирования и код
    const language = document.querySelector('.logic-type-btn.active').dataset.type;
    const code = document.getElementById('block-logic').value;
    
    // Создаем объект блока
    const block = {
        ...formData,
        language,
        code,
        createdAt: new Date().toISOString(),
        id: generateBlockId()
    };
    
    // Сохраняем блок в localStorage
    const savedBlocks = JSON.parse(localStorage.getItem('customBlocks') || '[]');
    savedBlocks.push(block);
    localStorage.setItem('customBlocks', JSON.stringify(savedBlocks));
    
    // Очищаем форму
    blockCreatorForm.reset();
    blockInputsContainer.innerHTML = '';
    document.getElementById('block-logic').value = '';
    addBlockInput();
    updatePreview();
    
    // Показываем уведомление об успешном сохранении
    showNotification('Блок успешно сохранен!', 'success');
}

// Получение данных формы
function getFormData() {
    const name = document.getElementById('block-name').value;
    const category = document.getElementById('block-category').value;
    const type = document.getElementById('block-type').value;
    const color = blockColorInput.value;
    
    if (!name || !category || !type || !color) {
        alert('Пожалуйста, заполните все обязательные поля');
        return null;
    }
    
    // Собираем входные параметры
    const inputs = Array.from(blockInputsContainer.children).map(group => {
        const nameInput = group.querySelector('.param-name');
        const typeInput = group.querySelector('.param-type');
        const defaultInput = group.querySelector('.param-default');
        
        if (!nameInput.value || !typeInput.value) {
            throw new Error('Пожалуйста, заполните все обязательные поля параметров');
        }
        
        return {
            name: nameInput.value,
            type: typeInput.value,
            default: defaultInput.value
        };
    });
    
    return { name, category, type, color, inputs };
}

// Обработка создания категории
function handleCategorySubmit(event) {
    event.preventDefault();
    
    const name = document.getElementById('category-name').value;
    const color = categoryColorInput.value;
    const description = document.getElementById('category-description').value;
    
    if (!name || !color) {
        alert('Пожалуйста, заполните все обязательные поля');
        return;
    }
    
    // Создаем новую категорию
    const category = {
        id: 'custom_' + Date.now(),
        name,
        color,
        description,
        createdAt: new Date().toISOString()
    };
    
    // Сохраняем категорию
    const customCategories = JSON.parse(localStorage.getItem('customCategories') || '[]');
    customCategories.push(category);
    localStorage.setItem('customCategories', JSON.stringify(customCategories));
    
    // Обновляем список категорий
    loadCustomCategories();
    
    // Выбираем новую категорию
    categorySelect.value = category.id;
    
    // Закрываем модальное окно
    categoryModal.classList.remove('show');
    
    // Очищаем форму
    categoryForm.reset();
    
    // Показываем уведомление
    alert('Категория успешно создана!');
}

// Вспомогательная функция для корректировки цвета
function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Генерация уникального ID для блока
function generateBlockId() {
    return 'block_' + Math.random().toString(36).substr(2, 9);
}

// Показ уведомлений
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Удаление через 3 секунды
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Функция debounce для оптимизации частых обновлений
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', initBlockCreator); 