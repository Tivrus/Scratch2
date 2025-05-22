// Built-in libraries data
const builtinLibraries = [
    {
        name: 'Математика',
        description: 'Математические операции и функции',
        blocks: ['сложить', 'вычесть', 'умножить', 'разделить', 'остаток', 'округлить', 'случайное']
    },
    {
        name: 'Строки',
        description: 'Операции со строками и текстом',
        blocks: ['объединить', 'длина', 'подстрока', 'заменить', 'разделить']
    },
    {
        name: 'Списки',
        description: 'Работа со списками и массивами',
        blocks: ['добавить', 'удалить', 'получить', 'длина', 'сортировка']
    }
];

// User libraries storage
let userLibraries = JSON.parse(localStorage.getItem('userLibraries')) || [];

// DOM Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const builtinLibrariesList = document.querySelector('#builtin-libraries .library-list');
const userLibrariesList = document.querySelector('#user-libraries .library-list');
const addLibraryBtn = document.querySelector('.add-library-btn');

// Initialize page
function initLibrariesPage() {
    // Load libraries
    loadLibraries();
    
    // Setup tab switching
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // Setup add library button
    addLibraryBtn.addEventListener('click', showAddLibraryForm);
}

// Load libraries into the page
function loadLibraries() {
    // Load built-in libraries
    builtinLibrariesList.innerHTML = builtinLibraries.map(lib => createLibraryItem(lib)).join('');
    
    // Load user libraries
    userLibrariesList.innerHTML = userLibraries.map(lib => createLibraryItem(lib, true)).join('');
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-library-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const libraryName = e.target.closest('.library-item').dataset.name;
            removeLibrary(libraryName);
        });
    });
}

// Create library item HTML
function createLibraryItem(library, isUserLibrary = false) {
    return `
        <div class="library-item" data-name="${library.name}">
            <h3>${library.name}</h3>
            <p>${library.description}</p>
            <div class="library-blocks">
                ${library.blocks.map(block => `<span class="block-tag">${block}</span>`).join('')}
            </div>
            ${isUserLibrary ? `<button class="remove-library-btn">Удалить</button>` : ''}
        </div>
    `;
}

// Switch between tabs
function switchTab(tabName) {
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-libraries`);
    });
}

// Show form to add new library
function showAddLibraryForm() {
    const form = document.createElement('form');
    form.className = 'add-library-form';
    form.innerHTML = `
        <div class="form-group">
            <label for="library-name">Название библиотеки:</label>
            <input type="text" id="library-name" required>
        </div>
        <div class="form-group">
            <label for="library-description">Описание:</label>
            <textarea id="library-description" required></textarea>
        </div>
        <div class="form-group">
            <label>Блоки:</label>
            <div id="library-blocks-container">
                <div class="block-input">
                    <input type="text" class="block-name" required>
                    <button type="button" class="remove-block-btn">×</button>
                </div>
            </div>
            <button type="button" class="add-block-btn">Добавить блок</button>
        </div>
        <div class="form-actions">
            <button type="submit" class="save-library-btn">Сохранить</button>
            <button type="button" class="cancel-library-btn">Отмена</button>
        </div>
    `;
    
    // Replace library list with form
    userLibrariesList.innerHTML = '';
    userLibrariesList.appendChild(form);
    
    // Add event listeners
    form.querySelector('.add-block-btn').addEventListener('click', () => {
        const container = form.querySelector('#library-blocks-container');
        const blockInput = document.createElement('div');
        blockInput.className = 'block-input';
        blockInput.innerHTML = `
            <input type="text" class="block-name" required>
            <button type="button" class="remove-block-btn">×</button>
        `;
        container.appendChild(blockInput);
        
        blockInput.querySelector('.remove-block-btn').addEventListener('click', () => {
            blockInput.remove();
        });
    });
    
    form.querySelectorAll('.remove-block-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.block-input').remove();
        });
    });
    
    form.querySelector('.cancel-library-btn').addEventListener('click', () => {
        loadLibraries();
    });
    
    form.addEventListener('submit', handleAddLibrarySubmit);
}

// Handle library form submission
function handleAddLibrarySubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const name = form.querySelector('#library-name').value;
    const description = form.querySelector('#library-description').value;
    const blocks = Array.from(form.querySelectorAll('.block-name')).map(input => input.value);
    
    const newLibrary = {
        name,
        description,
        blocks
    };
    
    userLibraries.push(newLibrary);
    localStorage.setItem('userLibraries', JSON.stringify(userLibraries));
    
    loadLibraries();
}

// Remove library
function removeLibrary(libraryName) {
    if (confirm(`Удалить библиотеку "${libraryName}"?`)) {
        userLibraries = userLibraries.filter(lib => lib.name !== libraryName);
        localStorage.setItem('userLibraries', JSON.stringify(userLibraries));
        loadLibraries();
    }
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', initLibrariesPage); 