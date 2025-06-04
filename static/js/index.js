// Block definitions for each category
let BASE_Z_INDEX = 1000; // Базовый z-index для всех элементов

// Устанавливаем CSS-переменную для z-index
document.documentElement.style.setProperty('--base-z-index', BASE_Z_INDEX);

// Функция для загрузки определений блоков
async function loadBlockDefinitions() {
    try {
        const response = await fetch('/static/js/blockTypes.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Преобразуем структуру для обратной совместимости
        const blockDefinitions = {};
        
        // Для каждой категории
        Object.entries(data.categories).forEach(([category, types]) => {
            blockDefinitions[category] = {};
            
            // Для каждого типа блока в категории
            Object.entries(types).forEach(([type, blocks]) => {
                // Определяем цвет блока на основе типа
                let blockColor;
                switch(type) {
                    case 'numbers':
                    case 'string':
                    case 'logical':
                        blockColor = 'green';
                        break;
                    case 'actions':
                        blockColor = 'red';
                        break;
                    case 'info':
                        blockColor = 'blue';
                        break;
                }
                
                // Добавляем блоки в соответствующую секцию
                if (blocks.length > 0) {
                    if (type === 'numbers' || type === 'logical' || type === 'string') {
                        if (!blockDefinitions[category].math) {
                            blockDefinitions[category].math = {};
                        }
                        blockDefinitions[category].math[type] = blocks.map(block => ({
                            ...block,
                            type: blockColor
                        }));
                    } else {
                        blockDefinitions[category][type] = blocks.map(block => ({
                            ...block,
                            type: blockColor
                        }));
                    }
                }
            });
        });
        
        return blockDefinitions;
    } catch (error) {
        console.error('Error loading block definitions:', error);
        return {};
    }
}

// DOM elements
let activeCategory = null;
let scriptWorkspace;
let blockPalette;
let categories;
let mouseCursor;
let mouseCoordinates;
let keyboardVisualization;
let zoomLevel = 100;
let currentScale = 1;
let isDragging = false;
let draggedBlock = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let blockChain = [];
let blockDefinitions = {}; // Будет заполнено после загрузки

// Execution variables and utilities
let isRunning = false;
let currentScriptBlocks = [];
let scriptTimeout;

// Глобальные переменные для масштабирования
let currentZoom = 1;
const ZOOM_STEP = 0.15; // Шаг масштабирования 15%
const MIN_ZOOM = 0.5;   // Минимальный масштаб 50%
const MAX_ZOOM = 2.0;   // Максимальный масштаб 200%
const GRID_SIZE = 20;   // Размер сетки
const BASE_BLOCK_WIDTH = 170; // Базовая ширина блока

// Глобальные переменные для управления перетаскиванием и z-index
let activeDragBlock = null;
let dragBlockZIndex = 10000; // Базовый z-index для перетаскивания

// Добавляем флаг для контроля автоматической активации категорий
let isInitialLoad = true;
let isUserScrolling = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM loaded - starting initialization");
    
    // Загружаем определения блоков
    blockDefinitions = await loadBlockDefinitions();
    
    // Инициализация основных элементов
    scriptWorkspace = document.getElementById('scripts-workspace');
    blockPalette = document.querySelector('.blocks-palette');
    categories = document.querySelectorAll('.category');
    mouseCursor = document.getElementById('mouse-cursor');
    mouseCoordinates = document.getElementById('mouse-coordinates');
    keyboardVisualization = document.getElementById('keyboard-visualization');

    if (!scriptWorkspace || !blockPalette) {
        console.error("Critical elements missing:", 
                     !scriptWorkspace ? "scriptWorkspace" : "", 
                     !blockPalette ? "blockPalette" : "");
        return;
    }

    // Создаем категории и ждем их создания
    createCategories();
    
    // Обновляем список категорий после их создания
    categories = document.querySelectorAll('.category');

    // Устанавливаем обработчики для категорий
    categories.forEach(category => {
        category.addEventListener('click', () => selectCategory(category.dataset.category));
    });

    // Инициализируем блоки для категории start
    const startCategory = document.querySelector('.category[data-category="start"]');
    if (startCategory) {
        // Устанавливаем активную категорию
        activeCategory = 'start';
        startCategory.classList.add('active');
        
        // Очищаем палитру блоков перед добавлением новых
        blockPalette.innerHTML = '';

        // Загружаем блоки для всех категорий
        const categoryNames = {
            'start': 'Запуск',
            'mouse': 'Управление мышью',
            'keyboard': 'Управление клавиатурой',
            'vision': 'Компьютерное зрение',
            'voice': 'Голосовые команды',
            'math': 'Математические операции',
            'control': 'Управление'
        };

        // Добавляем все категории и их блоки
        Object.keys(blockDefinitions).forEach(category => {
            const categoryTitle = document.createElement('div');
            categoryTitle.className = 'category-title';
            categoryTitle.textContent = categoryNames[category] || category;
            categoryTitle.dataset.category = category;
            blockPalette.appendChild(categoryTitle);
            
            // Добавляем блоки для этой категории
            const categoryBlocks = blockDefinitions[category];
            if (categoryBlocks) {
                Object.values(categoryBlocks).forEach(section => {
                    if (Array.isArray(section)) {
                        section.forEach(block => {
                            createBlockInPalette(block);
                        });
                    }
                });
            }
        });

        // Настраиваем отслеживание прокрутки
        setupCategoryScrollTracking();
        
        // Убираем автоматическую прокрутку при инициализации
        // Просто устанавливаем scrollTop в 0 без анимации
        blockPalette.scrollTop = 0;
    }

    // Set up zoom controls
    document.getElementById('zoom-in').addEventListener('click', () => changeZoom(10));
    document.getElementById('zoom-out').addEventListener('click', () => changeZoom(-10));
    document.getElementById('zoom-reset').addEventListener('click', () => resetZoom());

    // Set up mouse visualization
    setupMouseVisualization();

    // Set up keyboard visualization
    createKeyboardLayout();
    
    // Устанавливаем обработчик для палитры блоков
    blockPalette.addEventListener('mousedown', onPaletteMouseDown, { capture: true });
    
    // Чтобы рабочая область реагировала на перетаскивание
    scriptWorkspace.addEventListener('dragover', function(e) {
        e.preventDefault(); // Необходимо для разрешения drop
        scriptWorkspace.classList.add('drag-over');
    });
    
    scriptWorkspace.addEventListener('dragleave', function() {
        scriptWorkspace.classList.remove('drag-over');
    });
    
    // Добавляем обработчик для drop событий
    scriptWorkspace.addEventListener('drop', onBlockDrop);
    
    // Добавляем обработчик mouseover для более отзывчивого интерфейса
    scriptWorkspace.addEventListener('mouseover', (e) => {
        const block = findParentBlock(e.target);
        if (block && !block.classList.contains('dragging')) {
            block.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.2)';
        }
    });
    
    scriptWorkspace.addEventListener('mouseout', (e) => {
        const block = findParentBlock(e.target);
        if (block && !block.classList.contains('dragging')) {
            block.style.boxShadow = '';
        }
    });
    
    // Add run button to header
    createRunControls();

    // Инициализация зум-контролов
    initZoomControls();
    updateZoom();

    // Initialize modals
    initModals();

    // Обработчик для кнопки "Библиотеки" внизу панели категорий
    const openLibrariesBtn = document.getElementById('open-libraries-btn');
    if (openLibrariesBtn) {
        openLibrariesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = document.getElementById('libraries-modal');
            if (modal) {
                modal.style.display = 'block';
            }
        });
    }
});

// Модифицируем функцию createCategories для добавления отладочной информации
function createCategories() {
    console.log("Starting category creation");
    const categoriesContainer = document.querySelector('.block-categories');
    
    if (!categoriesContainer) {
        console.error("Categories container not found!");
        return;
    }
    
    // Сохраняем кнопку библиотек
    const librariesBtnContainer = categoriesContainer.querySelector('.libraries-btn');
    
    // Очищаем контейнер, но сохраняем кнопку библиотек
    categoriesContainer.innerHTML = '';
    if (librariesBtnContainer) {
        categoriesContainer.appendChild(librariesBtnContainer);
    }
    
    console.log("Categories container cleared");
    
    // Создаем категории
    const categoryData = [
        { id: 'start', name: 'События' },
        { id: 'mouse', name: 'Мышь' },
        { id: 'keyboard', name: 'Клавиатура' },
        { id: 'vision', name: 'Компьютерное зрение' },
        { id: 'voice', name: 'Голосовые команды' },
        { id: 'math', name: 'Операторы' },
        { id: 'control', name: 'Управление' }
    ];
    
    // Создаем контейнер для категорий
    const categoriesWrapper = document.createElement('div');
    categoriesWrapper.className = 'categories-wrapper';
    
    categoryData.forEach(cat => {
        const categoryElement = document.createElement('div');
        categoryElement.className = 'category';
        categoryElement.dataset.category = cat.id;
        if (cat.id === 'start') categoryElement.classList.add('active');

        // Круглая иконка
        const circle = document.createElement('span');
        circle.className = 'category-circle';
        // Цвет задается через CSS по data-category

        // Текст
        const label = document.createElement('span');
        label.className = 'category-label';
        label.textContent = cat.name;

        categoryElement.appendChild(circle);
        categoryElement.appendChild(label);

        categoriesWrapper.appendChild(categoryElement);
    });

    // Добавляем категории перед кнопкой библиотек
    if (librariesBtnContainer) {
        categoriesContainer.insertBefore(categoriesWrapper, librariesBtnContainer);
    } else {
        categoriesContainer.appendChild(categoriesWrapper);
    }

}

// Select a category and display its blocks
function selectCategory(categoryName) {
    // Проверяем, не является ли категория уже активной
    if (activeCategory === categoryName) {
        return;
    }
    
    // Обновляем активную категорию
    categories.forEach(cat => {
        if (cat.dataset.category === categoryName) {
            cat.classList.add('active');
        } else {
            cat.classList.remove('active');
        }
    });
    activeCategory = categoryName;
    
    // Очищаем палитру блоков
    blockPalette.innerHTML = '';
    
    // Словарь с отображаемыми названиями категорий
    const categoryNames = {
        'start': 'Запуск',
        'mouse': 'Управление мышью',
        'keyboard': 'Управление клавиатурой',
        'vision': 'Компьютерное зрение',
        'voice': 'Голосовые команды',
        'math': 'Математические операции',
        'control': 'Управление'
    };

    // Добавляем все категории и их блоки
    Object.keys(blockDefinitions).forEach(category => {
        const categoryTitle = document.createElement('div');
        categoryTitle.className = 'category-title';
        categoryTitle.textContent = categoryNames[category] || category;
        categoryTitle.dataset.category = category;
        blockPalette.appendChild(categoryTitle);
                
        // Добавляем блоки для этой категории
        const categoryBlocks = blockDefinitions[category];
        if (categoryBlocks) {
            Object.entries(categoryBlocks).forEach(([type, blocks]) => {
                if (type !== 'color' && Array.isArray(blocks)) {
                    blocks.forEach(block => {
                        createBlockInPalette(block, category);
                    });
                }
            });
        }
    });

    // Пересоздаем отслеживание прокрутки
    setupCategoryScrollTracking();

    // Прокручиваем к выбранной категории только при явном клике
    const targetCategory = document.querySelector(`.category-title[data-category="${categoryName}"]`);
    if (targetCategory) {
        // Временно отключаем отслеживание прокрутки
        isUserScrolling = false;
        
        const scrollTop = targetCategory.offsetTop - blockPalette.offsetTop - 10;
        blockPalette.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
        });
        
        // Включаем отслеживание прокрутки через время анимации
        setTimeout(() => {
            isUserScrolling = true;
        }, 300);
    }
}

// Функция для отслеживания видимости категорий при прокрутке
function setupCategoryScrollTracking() {
    let lastVisibleCategory = null;
    let scrollTimeout = null;

    const observer = new IntersectionObserver((entries) => {
        // Игнорируем события во время начальной загрузки
        if (isInitialLoad) {
            console.log("Observer ignored: initial load");
            return;
        }
        
        // Игнорируем события, если это не пользовательская прокрутка
        if (!isUserScrolling) {
             console.log("Observer ignored: not user scrolling");
            return;
        }

        // Находим категорию с наибольшим процентом видимости
        let mostVisibleEntry = null;
        let maxVisibility = 0;

        console.log("--- Scroll Event ---");
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Вычисляем процент видимости с учетом высоты элемента
                const rect = entry.boundingClientRect;
                const containerRect = blockPalette.getBoundingClientRect();
                
                // Видимая область в контейнере прокрутки
                const visibleTop = Math.max(containerRect.top, rect.top);
                const visibleBottom = Math.min(containerRect.bottom, rect.bottom);
                const visibleHeight = Math.max(0, visibleBottom - visibleTop);
                
                // Общая высота элемента
                const elementHeight = rect.height;
                
                // Вычисляем процент видимости относительно высоты элемента
                const visibilityPercent = (visibleHeight / elementHeight) * 100;
                
                console.log(`Category: ${entry.target.dataset.category}, Visible Height: ${visibleHeight.toFixed(2)}px, Element Height: ${elementHeight.toFixed(2)}px, Visibility: ${visibilityPercent.toFixed(2)}%`);
                
                if (visibilityPercent > maxVisibility) {
                    maxVisibility = visibilityPercent;
                    mostVisibleEntry = entry;
                }
            }
        });

        // Если нашли видимую категорию с процентом больше нуля и она отличается от текущей
        if (mostVisibleEntry && maxVisibility > 0 && mostVisibleEntry.target.dataset.category !== activeCategory) {
            const category = mostVisibleEntry.target.dataset.category;
            console.log(`Most visible category: ${category}, Visibility: ${maxVisibility.toFixed(2)}%`);
            
            // Очищаем предыдущий таймаут, если он есть
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }

            scrollTimeout = setTimeout(() => {
                if (category !== lastVisibleCategory) {
                    console.log(`Activating category: ${category}`);
                    // Обновляем активную категорию без прокрутки
                    categories.forEach(cat => {
                        if (cat.dataset.category === category) {
                            cat.classList.add('active');
                        } else {
                            cat.classList.remove('active');
                        }
                    });
                    activeCategory = category;
                    lastVisibleCategory = category;
                }
            }, 50);
        } else if (mostVisibleEntry) {
             console.log(`Most visible category (${mostVisibleEntry.target.dataset.category}) is already active or has 0% visibility.`);
        } else {
            console.log("No intersecting category found with significant visibility.");
        }
        console.log("--- End Scroll Event ---");

    }, {
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
        rootMargin: '-5% 0px -5% 0px',
        root: blockPalette // Устанавливаем корневым элементом палитру блоков
    });

    // Наблюдаем за всеми заголовками категорий
    document.querySelectorAll('.category-title').forEach(title => {
        observer.observe(title);
    });

    // Добавляем обработчики для определения пользовательской прокрутки
    blockPalette.addEventListener('scroll', () => {
         isUserScrolling = true;
        // Сбрасываем флаг через 100мс после последнего события прокрутки
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            isUserScrolling = false;
            // После окончания прокрутки проверяем видимость
            // Это может помочь в случае, когда IntersectionObserver пропустил финальное состояние
            checkVisibleCategoryOnScrollEnd();
        }, 100);
    });

     // Добавляем обработчики для колесика мыши и касаний, которые также устанавливают isUserScrolling
     blockPalette.addEventListener('wheel', () => { isUserScrolling = true; });
     blockPalette.addEventListener('touchstart', () => { isUserScrolling = true; });
     blockPalette.addEventListener('touchend', () => {
         // Сброс флага isUserScrolling будет происходить по таймауту scroll
     });

    // Функция для принудительной проверки видимой категории после окончания прокрутки
    function checkVisibleCategoryOnScrollEnd() {
        if (isInitialLoad || isUserScrolling) return; // Не проверяем, если еще загрузка или идет прокрутка

        let mostVisibleEntry = null;
        let maxVisibility = 0;

        document.querySelectorAll('.category-title').forEach(title => {
            const rect = title.getBoundingClientRect();
            const containerRect = blockPalette.getBoundingClientRect();

             // Видимая область в контейнере прокрутки
            const visibleTop = Math.max(containerRect.top, rect.top);
            const visibleBottom = Math.min(containerRect.bottom, rect.bottom);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);
            const elementHeight = rect.height;

            const visibilityPercent = (elementHeight > 0) ? (visibleHeight / elementHeight) * 100 : 0;

            if (visibilityPercent > maxVisibility) {
                maxVisibility = visibilityPercent;
                mostVisibleEntry = title;
            }
        });

        if (mostVisibleEntry && maxVisibility > 0 && mostVisibleEntry.dataset.category !== activeCategory) {
            const category = mostVisibleEntry.dataset.category;
            console.log(`Scroll end check: Activating category: ${category}`);
            categories.forEach(cat => {
                if (cat.dataset.category === category) {
                    cat.classList.add('active');
                } else {
                    cat.classList.remove('active');
                }
            });
            activeCategory = category;
            lastVisibleCategory = category; // Обновляем lastVisibleCategory
        }
    }

    // Сбрасываем флаг начальной загрузки после небольшой задержки
    setTimeout(() => {
        isInitialLoad = false;
         // Принудительно проверяем видимую категорию после начальной загрузки
         checkVisibleCategoryOnScrollEnd();
    }, 300);
}

// Create a block in the palette
function createBlockInPalette(blockData, category) {
    // Определяем шаблон для использования
    let templateClass = 'block'; // Базовый класс для всех блоков
    
    // Находим шаблон
    const template = document.querySelector('.block-templates .' + templateClass) || document.querySelector('.block-templates .block');
    
    if (!template) {
        console.error("Template not found for", templateClass);
        return;
    }
    
    // Клонируем шаблон
    const blockClone = template.cloneNode(true);
    
    // Устанавливаем текст
    const textElement = blockClone.querySelector('.block_text');
    if (textElement) {
        textElement.textContent = blockData.text;
    } else {
        console.error("No .block_text element in template");
    }
    
    // Добавляем поля ввода, если необходимо
    if (blockData.inputs && blockData.inputs.length > 0) {
        addInputsToBlock(blockClone, blockData.inputs, blockData);
    }
    
    // Применяем цвета из JSON и вычисляем цвет обводки
    if (category && blockDefinitions[category] && blockDefinitions[category].color) {
        const colors = blockDefinitions[category].color;
        const svgPath = blockClone.querySelector('.block-svg path');
        if (svgPath) {
            // Получаем RGB значения из строки цвета
            const rgbMatch = colors.fill.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (rgbMatch) {
                const r = parseInt(rgbMatch[1]);
                const g = parseInt(rgbMatch[2]);
                const b = parseInt(rgbMatch[3]);
                
                // Вычисляем более темный цвет для обводки (уменьшаем яркость на 25%)
                const darkenFactor = 0.75;
                const strokeR = Math.round(r * darkenFactor);
                const strokeG = Math.round(g * darkenFactor);
                const strokeB = Math.round(b * darkenFactor);
                
                // Применяем цвета
                svgPath.setAttribute('fill', colors.fill);
                svgPath.setAttribute('stroke', `rgb(${strokeR}, ${strokeG}, ${strokeB})`);
            } else {
                // Если не удалось распарсить RGB, используем цвета как есть
                svgPath.setAttribute('fill', colors.fill);
                svgPath.setAttribute('stroke', colors.stroke);
            }
        }
    }
    
    // Store block data
    blockClone.dataset.category = category;
    if (blockData.blockType) {
        blockClone.dataset.functionType = blockData.blockType;
    }
    
    // Make sure all blocks have IDs
    if (!blockClone.id) {
        blockClone.id = 'palette-block-' + Math.random().toString(36).substr(2, 9);
    }
    
    // Сохраняем данные блока для клонирования
    blockClone.dataset.blockInfo = JSON.stringify({
        category: category,
        text: blockData.text,
        blockType: blockData.blockType || '',
        inputs: blockData.inputs || []
    });
    
    // Явно устанавливаем стили, чтобы гарантировать видимость и перетаскиваемость
    blockClone.style.display = 'block';
    blockClone.style.visibility = 'visible';
    blockClone.style.opacity = '1';
    blockClone.style.position = 'relative';
    
    // Делаем блок перетаскиваемым
    blockClone.setAttribute('draggable', 'true');
    
    // Добавляем обработчики для нативного drag and drop
    blockClone.addEventListener('dragstart', function(e) {
        console.log("Drag started for block:", blockClone.id);
        e.dataTransfer.setData('application/block-info', blockClone.dataset.blockInfo);
        e.dataTransfer.effectAllowed = 'copy';
        blockClone.classList.add('dragged');
    });
    
    blockClone.addEventListener('dragend', function() {
        blockClone.classList.remove('dragged');
    });
    
    // Добавляем прямой обработчик клика для перетаскивания (альтернативный метод)
    blockClone.addEventListener('mousedown', function(e) {
        // Не запускаем перетаскивание для кликов по полям ввода
        if (e.target.classList.contains('block-input')) return;
        onPaletteBlockMouseDown(e, blockClone);
    });
    
    // Добавляем в палитру
    blockPalette.appendChild(blockClone);
    
    console.log("Created palette block:", blockClone.id, "with text:", blockData.text);
    return blockClone;
}

// Обработчик нажатия мыши на блок в палитре (альтернативный метод перетаскивания)
function onPaletteBlockMouseDown(e, block) {
    e.preventDefault();
        e.stopPropagation();
    
    const workspace = document.querySelector('.scripts-workspace');
    const workspaceRect = workspace.getBoundingClientRect();
    const blockRect = block.getBoundingClientRect();
    
    // Очищаем предыдущий активный блок, если он есть
    if (activeDragBlock) {
        activeDragBlock.remove();
        activeDragBlock = null;
    }
    
    // Создаем клон блока для перетаскивания
    const dragBlock = block.cloneNode(true);
    dragBlock.classList.add('dragging');
    dragBlock.style.position = 'fixed';
    
    // Устанавливаем z-index для перетаскиваемого блока
    dragBlock.style.zIndex = dragBlockZIndex++;
    
    // Вычисляем смещение курсора относительно блока
    const offsetX = e.clientX - blockRect.left;
    const offsetY = e.clientY - blockRect.top;
    
    // Устанавливаем начальную позицию с учетом смещения
    dragBlock.style.left = `${e.clientX - offsetX}px`;
    dragBlock.style.top = `${e.clientY - offsetY}px`;
    dragBlock.style.transform = `scale(${1 / currentZoom})`;
    dragBlock.style.transformOrigin = '0 0';
    
    // Сохраняем ссылку на активный блок
    activeDragBlock = dragBlock;
    
    // Добавляем блок в body для корректного перетаскивания
    document.body.appendChild(dragBlock);
    
    // Добавляем класс для подсветки рабочей области
    workspace.classList.add('drag-over');
    
    function onMove(moveEvent) {
        moveEvent.preventDefault();
        
        // Обновляем позицию с учетом смещения
        dragBlock.style.left = `${moveEvent.clientX - offsetX}px`;
        dragBlock.style.top = `${moveEvent.clientY - offsetY}px`;
        
        // Проверяем, находится ли блок над рабочей областью
        const dragRect = dragBlock.getBoundingClientRect();
        const isOverWorkspace = 
            dragRect.left >= workspaceRect.left &&
            dragRect.right <= workspaceRect.right &&
            dragRect.top >= workspaceRect.top &&
            dragRect.bottom <= workspaceRect.bottom;
        
        if (isOverWorkspace) {
            // Вычисляем позицию относительно рабочей области
            const x = (moveEvent.clientX - workspaceRect.left - offsetX) / currentZoom;
            const y = (moveEvent.clientY - workspaceRect.top - offsetY) / currentZoom;
            
            // Проверяем возможность соединения с другими блоками
            const closestBlock = findClosestBlockForConnection(dragBlock, workspace.querySelectorAll('.block:not(.dragging)'));
            if (closestBlock) {
                showGhostPreview(dragBlock, closestBlock);
        } else {
                clearGhostPreviews();
            }
        } else {
            clearGhostPreviews();
        }
    }
    
    function onUp(upEvent) {
        upEvent.preventDefault();
        
        // Удаляем обработчики событий
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        
        // Удаляем класс подсветки
        workspace.classList.remove('drag-over');
        
        // Проверяем, был ли блок помещен в рабочую область
        const dragRect = dragBlock.getBoundingClientRect();
        const isOverWorkspace = 
            dragRect.left >= workspaceRect.left &&
            dragRect.right <= workspaceRect.right &&
            dragRect.top >= workspaceRect.top &&
            dragRect.bottom <= workspaceRect.bottom;
        
        if (isOverWorkspace) {
            // Вычисляем позицию относительно рабочей области
            const x = (upEvent.clientX - workspaceRect.left - offsetX) / currentZoom;
            const y = (upEvent.clientY - workspaceRect.top - offsetY) / currentZoom;
            
            // Создаем новый блок в рабочей области с привязкой к сетке
            const gridX = Math.round(x / GRID_SIZE) * GRID_SIZE;
            const gridY = Math.round(y / GRID_SIZE) * GRID_SIZE;
            
            const newBlock = createBlockInWorkspace(block, gridX, gridY);
            
            // Проверяем возможность соединения
            const closestBlock = findClosestBlockForConnection(newBlock, workspace.querySelectorAll('.block:not(.dragging)'));
            if (closestBlock && canConnectBlocks(newBlock, closestBlock.block)) {
                connectBlocks(newBlock, closestBlock.block);
                showConnectionAnimation(newBlock, closestBlock.block);
            }
    }
    
        // Удаляем перетаскиваемый блок
        dragBlock.remove();
        activeDragBlock = null;
        clearGhostPreviews();
    }
    
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
}

// Создаем блок в рабочей области
function createBlockInWorkspace(sourceBlock, x, y) {
    const workspace = document.querySelector('.scripts-workspace');
    const newBlock = sourceBlock.cloneNode(true);
    
    // Сохраняем цвета из исходного блока
    const svgPath = newBlock.querySelector('.block-svg path');
    const sourceSvgPath = sourceBlock.querySelector('.block-svg path');
    if (svgPath && sourceSvgPath) {
        // Копируем атрибуты fill и stroke напрямую
        svgPath.setAttribute('fill', sourceSvgPath.getAttribute('fill'));
        svgPath.setAttribute('stroke', sourceSvgPath.getAttribute('stroke'));
    }
    
    // Устанавливаем базовые стили для блока
    newBlock.style.position = 'absolute';
    newBlock.style.left = `${x}px`;
    newBlock.style.top = `${y}px`;
    newBlock.style.width = `${BASE_BLOCK_WIDTH}px`;
    newBlock.style.minWidth = `${BASE_BLOCK_WIDTH}px`;
    newBlock.style.maxWidth = `${BASE_BLOCK_WIDTH}px`;
    
    // Устанавливаем начальный z-index
    newBlock.style.zIndex = BASE_Z_INDEX;
    
    // Добавляем блок в рабочую область
    workspace.appendChild(newBlock);
    
    // Делаем блок перетаскиваемым
    makeBlockDraggableDirect(newBlock);
    
    // Добавляем кнопку удаления
    addDeleteButton(newBlock);
    
    // Добавляем точки соединения
    addConnectionPoints(newBlock);
    
    // Обновляем z-index для нового блока
    updateBlockZIndex(newBlock);
    
    return newBlock;
}

// Добавляет соединительные точки к блоку
function addConnectionPoints(block) {
    // Проверяем, не является ли блок частью цепочки
    if (block.classList.contains('connected-top') || block.classList.contains('connected-bottom') || block.classList.contains('chain-member')) {
        return; // Не добавляем точки соединения для блоков в цепочке
    }

    // Добавляем классы для возможности соединения
    block.classList.add('can-connect-top', 'can-connect-bottom');
    
    // Создаем точки соединения
    const topPoint = document.createElement('div');
    topPoint.className = 'connection-point-top';
    block.appendChild(topPoint);
    
    const bottomPoint = document.createElement('div');
    bottomPoint.className = 'connection-point-bottom';
    block.appendChild(bottomPoint);
}

// Проверяет возможность соединения блоков
function canConnectBlocks(block1, block2) {
    // Проверяем, не являются ли блоки частью цепочки
    if (block1.classList.contains('connected-top') || 
        block1.classList.contains('connected-bottom') || 
        block1.classList.contains('chain-member') ||
        block2.classList.contains('connected-top') || 
        block2.classList.contains('connected-bottom') || 
        block2.classList.contains('chain-member')) {
        return false;
    }

    // Проверяем, не пытаемся ли мы соединить блок с самим собой
    if (block1 === block2) {
        return false;
    }

    // Проверяем, не соединены ли блоки уже
    if (isBlockConnectedTo(block1, block2)) {
        return false;
    }

    // Проверяем, находится ли один блок под другим
    const rect1 = block1.getBoundingClientRect();
    const rect2 = block2.getBoundingClientRect();
    
    // Проверяем вертикальное расстояние между блоками
    const verticalDistance = Math.abs(rect1.bottom - rect2.top);
    const maxVerticalDistance = 20; // Максимальное расстояние для соединения
    
    // Проверяем горизонтальное выравнивание
    const horizontalOverlap = Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left);
    const minOverlap = 30; // Минимальное перекрытие для соединения
    
    return verticalDistance <= maxVerticalDistance && horizontalOverlap >= minOverlap;
}

// Показывает предварительный просмотр соединения
function showConnectionPreview(block1, block2) {
    // Проверяем, не являются ли блоки частью цепочки
    if (block1.classList.contains('connected-top') || 
        block1.classList.contains('connected-bottom') || 
        block1.classList.contains('chain-member') ||
        block2.classList.contains('connected-top') || 
        block2.classList.contains('connected-bottom') || 
        block2.classList.contains('chain-member')) {
        return;
    }

    if (canConnectBlocks(block1, block2)) {
        // Определяем, какой блок находится выше
        const rect1 = block1.getBoundingClientRect();
        const rect2 = block2.getBoundingClientRect();
        const upperBlock = rect1.top < rect2.top ? block1 : block2;
        const lowerBlock = upperBlock === block1 ? block2 : block1;

        // Показываем превью соединения
        upperBlock.classList.add('potential-connection');
        lowerBlock.classList.add('potential-connection');
        
        // Показываем активные точки соединения
        const upperPoint = upperBlock.querySelector('.connection-point-bottom');
        const lowerPoint = lowerBlock.querySelector('.connection-point-top');
        
        if (upperPoint) upperPoint.classList.add('active');
        if (lowerPoint) lowerPoint.classList.add('active');
    }
}

// Очищает предварительный просмотр соединения
function clearConnectionPreview() {
    const preview = document.querySelector('.connection-preview');
    if (preview) preview.remove();
    
    // Деактивируем все точки соединения
    document.querySelectorAll('.connection-point-top.active, .connection-point-bottom.active')
        .forEach(point => point.classList.remove('active'));
}

/**
 * Соединяет два блока
 * @param {HTMLElement} upperBlock - Верхний блок
 * @param {HTMLElement} lowerBlock - Нижний блок
 */
function connectBlocks(upperBlock, lowerBlock) {
    // Проверяем, не пытаемся ли мы соединить блок с самим собой
    if (upperBlock === lowerBlock) {
        return;
    }
    
    // Получаем координаты блоков
    const upperRect = upperBlock.getBoundingClientRect();
    const lowerRect = lowerBlock.getBoundingClientRect();
    const workspace = document.querySelector('.scripts-workspace');
    const workspaceRect = workspace.getBoundingClientRect();
    
    // Вычисляем новые координаты для нижнего блока
    const upperX = (upperRect.left - workspaceRect.left) / currentZoom;
    const upperY = (upperRect.top - workspaceRect.top) / currentZoom;
    
    // Позиционируем нижний блок точно под верхним
    lowerBlock.style.left = `${upperX}px`;
    lowerBlock.style.top = `${upperY + upperRect.height - 15}px`;
    
    // Добавляем классы соединения
    upperBlock.classList.add('connected-bottom');
    lowerBlock.classList.add('connected-top');
    
    // Обновляем позиции всех блоков в цепочке
    updateBlockChainPositions(upperBlock);
    // Обновляем z-index для всей цепочки после соединения
    updateBlockZIndex(upperBlock);
    // Показываем анимацию соединения
    showConnectionAnimation(upperBlock, lowerBlock);
}

/**
 * Разрывает соединение между двумя блоками
 * @param {HTMLElement} upperBlock - Верхний блок
 * @param {HTMLElement} lowerBlock - Нижний блок
 */
function disconnectBlocks(upperBlock, lowerBlock) {
    upperBlock.classList.remove('connected-bottom');
    lowerBlock.classList.remove('connected-top');
    
    // Обновляем позиции оставшихся блоков в обеих цепочках
    updateBlockChainPositions(upperBlock);
    updateBlockChainPositions(lowerBlock);
}

/**
 * Находит верхний блок, соединенный с данным блоком
 * @param {HTMLElement} block - Блок для поиска
 * @returns {HTMLElement|null} Верхний блок или null, если не найден
 */
function findUpperConnectedBlock(block) {
    const allBlocks = Array.from(document.querySelectorAll('.scripts-workspace .block'));
    return allBlocks.find(b => 
        b.classList.contains('connected-bottom') && 
        isDirectlyBelow(b, block)
    );
}

/**
 * Находит нижний блок, соединенный с данным блоком
 * @param {HTMLElement} block - Блок для поиска
 * @returns {HTMLElement|null} Нижний блок или null, если не найден
 */
function findLowerConnectedBlock(block) {
    const allBlocks = Array.from(document.querySelectorAll('.scripts-workspace .block'));
    return allBlocks.find(b => 
        b.classList.contains('connected-top') && 
        isDirectlyBelow(block, b)
    );
}

/**
 * Проверяет, находится ли нижний блок непосредственно под верхним
 * @param {HTMLElement} upperBlock - Верхний блок
 * @param {HTMLElement} lowerBlock - Нижний блок
 * @returns {boolean} true, если блоки находятся друг под другом
 */
function isDirectlyBelow(upperBlock, lowerBlock) {
    const upperRect = upperBlock.getBoundingClientRect();
    const lowerRect = lowerBlock.getBoundingClientRect();
    
    // Проверяем, что блоки находятся примерно на одной вертикальной линии
    const xOverlap = Math.abs(upperRect.left - lowerRect.left) < 20;
    
    // Проверяем, что нижний блок находится сразу под верхним
    const yDistance = Math.abs(upperRect.bottom - lowerRect.top);
    const isClose = yDistance < 30;
    
    return xOverlap && isClose;
        }
        
/**
 * Обновляет позиции всех блоков в цепочке
 * @param {HTMLElement} topBlock - Верхний блок цепочки
 */
function updateBlockChainPositions(topBlock) {
    if (!topBlock) return;
    
    // Получаем текущие координаты верхнего блока
    const workspace = document.querySelector('.scripts-workspace');
        const workspaceRect = workspace.getBoundingClientRect();
    const topRect = topBlock.getBoundingClientRect();
    
    // Вычисляем начальные координаты с учетом масштаба
    const startX = (topRect.left - workspaceRect.left) / currentZoom;
    let currentY = (topRect.top - workspaceRect.top) / currentZoom;
    
    // Устанавливаем начальную позицию верхнего блока
    topBlock.style.left = `${startX}px`;
    topBlock.style.top = `${currentY}px`;
    
    // Включаем transition для всех блоков в цепочке
    const chainBlocks = [];
    let currentBlock = topBlock;
    
    // Собираем все блоки в цепочке
    while (currentBlock) {
        chainBlocks.push(currentBlock);
        const lowerBlock = findLowerConnectedBlock(currentBlock);
        if (!lowerBlock) break;
        currentBlock = lowerBlock;
    }
    
    // Применяем transition ко всем блокам в цепочке
    chainBlocks.forEach(block => {
        if (block !== topBlock) { // Не меняем transition для верхнего блока
            block.style.transition = 'all 0.2s ease';
        }
        block.style.margin = '0';
        block.style.padding = '0';
    });
        
    // Обновляем позиции, начиная с верхнего блока
    currentBlock = topBlock;
    while (currentBlock) {
        const lowerBlock = findLowerConnectedBlock(currentBlock);
        if (!lowerBlock) break;
        
        // Вычисляем позицию для нижнего блока
        const blockRect = currentBlock.getBoundingClientRect();
        const nextY = currentY + (blockRect.height / currentZoom) - 15; // Уменьшаем промежуток на 15px
        
        // Устанавливаем позицию нижнего блока
        lowerBlock.style.left = `${startX}px`;
        lowerBlock.style.top = `${nextY}px`;
        
        // Обновляем текущую Y-координату для следующего блока
        currentY = nextY;
        currentBlock = lowerBlock;
    }
    
    // Удаляем transition после завершения анимации
    setTimeout(() => {
        chainBlocks.forEach(block => {
            if (block !== topBlock) {
                block.style.transition = 'none';
            }
        });
    }, 200);
}

// ... existing code ...

// Обновляем обработчик перетаскивания в makeBlockDraggableDirect
function makeBlockDraggableDirect(block) {
    function onMouseDown(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Обновляем z-index при начале перетаскивания
        updateBlockZIndex(block);
        
        const workspace = document.querySelector('.scripts-workspace');
        const workspaceRect = workspace.getBoundingClientRect();
        const blockRect = block.getBoundingClientRect();
        
        // Вычисляем смещение курсора относительно блока с учетом масштаба
        const offsetX = (e.clientX - blockRect.left) / currentZoom;
        const offsetY = (e.clientY - blockRect.top) / currentZoom;
        
        // Находим все блоки в цепочке
        let blocksToMove = [block];
        let currentBlock = block;
        
        // Собираем все блоки, соединенные снизу
        while (true) {
            const nextBlock = findLowerConnectedBlock(currentBlock);
            if (!nextBlock) break;
            blocksToMove.push(nextBlock);
            currentBlock = nextBlock;
        }
        
        // Если блок соединен сверху, находим верхний блок цепочки
        let topBlock = block;
        while (true) {
            const upperBlock = findUpperConnectedBlock(topBlock);
            if (!upperBlock) break;
            blocksToMove.unshift(upperBlock);
            topBlock = upperBlock;
        }
        
        // Определяем индекс текущего блока в цепочке
        const currentBlockIndex = blocksToMove.indexOf(block);
        
        // Если это не верхний блок (индекс > 0), разрываем цепочку
        if (currentBlockIndex > 0) {
            // Разрываем соединение между текущим блоком и верхним
            const upperBlock = blocksToMove[currentBlockIndex - 1];
            disconnectBlocks(upperBlock, block);
            
            // Обновляем список блоков для перемещения - берем только блоки от текущего и ниже
            blocksToMove = blocksToMove.slice(currentBlockIndex);
        }
        
        // Сохраняем начальные позиции всех блоков
        const initialPositions = blocksToMove.map(b => ({
            block: b,
            x: parseFloat(b.style.left) || 0,
            y: parseFloat(b.style.top) || 0
        }));
        
        let connectionGhost = null;
        
        function onMove(moveEvent) {
            moveEvent.preventDefault();
            
            // Вычисляем новые координаты для верхнего блока с учетом масштаба
            const x = (moveEvent.clientX - workspaceRect.left) / currentZoom - offsetX;
            const y = (moveEvent.clientY - workspaceRect.top) / currentZoom - offsetY;
        
            // Вычисляем смещение от начальной позиции
            const deltaX = x - initialPositions[0].x;
            const deltaY = y - initialPositions[0].y;
            
            // Перемещаем все блоки в цепочке
            blocksToMove.forEach((blockToMove, index) => {
                const initialPos = initialPositions[index];
                blockToMove.style.left = `${initialPos.x + deltaX}px`;
                blockToMove.style.top = `${initialPos.y + deltaY}px`;
            });
        
            // Проверяем возможность соединения с другими блоками
            const allBlocks = Array.from(document.querySelectorAll('.scripts-workspace .block'));
            let foundConnection = false;
            
            for (const targetBlock of allBlocks) {
                if (!blocksToMove.includes(targetBlock) && !targetBlock.classList.contains('connection-ghost')) {
                    const connectionInfo = isInConnectionArea(block, targetBlock, moveEvent.clientX, moveEvent.clientY);
                    if (connectionInfo.canConnect) {
                        createConnectionGhost(block, targetBlock, connectionInfo.position);
                        foundConnection = true;
                        break;
                    }
                }
            }
            
            if (!foundConnection) {
                clearConnectionGhost();
            }
        }
        
        function onUp(upEvent) {
            upEvent.preventDefault();
            
            // Удаляем обработчики событий
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            
            // Очищаем призрак
            clearConnectionGhost();
            
            // Проверяем возможность соединения при отпускании блока
            const allBlocks = Array.from(document.querySelectorAll('.scripts-workspace .block'));
            for (const targetBlock of allBlocks) {
                if (!blocksToMove.includes(targetBlock) && !targetBlock.classList.contains('connection-ghost')) {
                    const connectionInfo = isInConnectionArea(block, targetBlock, upEvent.clientX, upEvent.clientY);
                    if (connectionInfo.canConnect) {
                        if (connectionInfo.position === 'top') {
                            connectBlocks(block, targetBlock);
                        } else {
                            connectBlocks(targetBlock, block);
                        }
                        break;
                    }
                }
            }
        }
        
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }
    
    block.addEventListener('mousedown', onMouseDown);
}

// Обработчик drop события в рабочей области
function onBlockDrop(e) {
    e.preventDefault();
    scriptWorkspace.classList.remove('drag-over');
    
    // Получаем информацию о блоке
    const blockInfo = e.dataTransfer.getData('application/block-info');
    if (!blockInfo) return;
    
    try {
        // Парсим данные
        const info = JSON.parse(blockInfo);
        
        // Находим подходящий блок в палитре
        const sourceBlock = findSourceBlockByInfo(info);
        if (!sourceBlock) return;
        
        // Вычисляем позицию для нового блока
        const rect = scriptWorkspace.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Создаем блок в рабочей области
        createBlockInWorkspace(sourceBlock, x, y);
    } catch (err) {
        console.error("Error processing dropped block:", err);
    }
}

// Находим исходный блок в палитре по информации
function findSourceBlockByInfo(info) {
    const blocks = Array.from(blockPalette.querySelectorAll('.block'));
    return blocks.find(block => {
        const text = block.querySelector('.block_text')?.textContent;
        return block.dataset.blockType === info.type && text === info.text;
    });
}

// Add inputs to the block
function addInputsToBlock(block, inputs, blockData) {
    const textElement = block.querySelector('.block_text');
    if (!textElement) return;
    
    const text = textElement.textContent;
    textElement.innerHTML = '';
    
    const parts = [];
    let lastIndex = 0;
    
    // Находим все параметры в скобках и разбиваем текст
    inputs.forEach(input => {
        const pattern = `(${input})`;
        const index = text.indexOf(pattern, lastIndex);
        
        if (index !== -1) {
            // Добавляем текст до параметра
            parts.push({
                type: 'text',
                content: text.substring(lastIndex, index)
            });
            
            // Добавляем параметр
            parts.push({
                type: 'input',
                name: input
            });
            
            lastIndex = index + pattern.length;
        }
    });
    
    // Добавляем оставшийся текст после последнего параметра
    if (lastIndex < text.length) {
        parts.push({
            type: 'text',
            content: text.substring(lastIndex)
        });
    }
    
    // Создаем DOM элементы
    parts.forEach(part => {
        if (part.type === 'text') {
            textElement.appendChild(document.createTextNode(part.content));
        } else if (part.type === 'input') {
            const inputContainer = document.createElement('span');
            inputContainer.className = 'input-container';
            
            // Проверяем, имеет ли этот блок выпадающее меню для этого параметра
            if (blockData && blockData.dropdowns && blockData.dropdowns[part.name]) {
                // Создаем выпадающее меню
                const selectElement = document.createElement('select');
                selectElement.className = 'block-input dropdown-input';
                
                // Добавляем опции
                blockData.dropdowns[part.name].forEach(option => {
                    const optionElement = document.createElement('option');
                    optionElement.value = option;
                    optionElement.textContent = option;
                    selectElement.appendChild(optionElement);
                });
                
                inputContainer.appendChild(selectElement);
                
                // Предотвращаем запуск drag при клике на выпадающее меню
                selectElement.addEventListener('mousedown', e => e.stopPropagation());
            } else {
                // Обычное текстовое поле
                const inputElement = document.createElement('input');
                inputElement.type = 'text';
                inputElement.className = 'block-input';
                inputElement.placeholder = part.name;
                
                inputContainer.appendChild(inputElement);
                
                // Предотвращаем запуск drag при клике на input
                inputElement.addEventListener('mousedown', e => e.stopPropagation());
            }
            
            textElement.appendChild(inputContainer);
        }
    });
}

// Обновляем обработчик нажатия мыши на палитру блоков
function onPaletteMouseDown(e) {
    // Only handle left mouse button
    if (e.button !== 0) return;
    
    // Find the block element that was clicked
    const block = findParentBlock(e.target);
    if (!block) return;
    
    // Skip if clicking on an input field
    if (e.target.classList.contains('block-input')) return;
    
    // Mark as dragging
    isDraggingFromPalette = true;
    
    // Create a clone for dragging
    const cleanBlock = createDragClone(block);
    cleanBlock.classList.add('dragged');
    
    // Calculate initial position
    const blockRect = block.getBoundingClientRect();
    const offsetX = e.clientX - blockRect.left;
    const offsetY = e.clientY - blockRect.top;
    
    // Add to body for dragging
    document.body.appendChild(cleanBlock);
    
    // Position the clone at the mouse point
    cleanBlock.style.left = (e.clientX - offsetX) + 'px';
    cleanBlock.style.top = (e.clientY - offsetY) + 'px';
    
    // Give a visual cue to the user
    block.style.opacity = '0.6';
    
    // Register mouse move and up handlers
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // Prevent default to avoid text selection
    e.preventDefault();
    
    // Define move handler
    function onMouseMove(moveEvent) {
        if (!isDraggingFromPalette) return;
        
        // Update clone position
        cleanBlock.style.left = (moveEvent.clientX - offsetX) + 'px';
        cleanBlock.style.top = (moveEvent.clientY - offsetY) + 'px';

        const workspace = document.querySelector('.scripts-workspace');
        const isOverWorkspace = isOverElement(moveEvent, workspace);
        
        if (isOverWorkspace) {
            workspace.classList.add('drag-over');
            cleanBlock.style.opacity = '0.9';
        } else {
            workspace.classList.remove('drag-over');
            cleanBlock.style.opacity = '0.7';
        }
    }
    
    // Define up handler
    function onMouseUp(upEvent) {
        if (!isDraggingFromPalette) return;
        
        // Remove listeners
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        
        // Restore the original block opacity
        block.style.opacity = '1';
        
        // Check if dropped over workspace
        const workspace = document.querySelector('.scripts-workspace');
        const isOverWorkspace = isOverElement(upEvent, workspace);
        
        if (isOverWorkspace) {
            // Get workspace coordinates
            const workspaceRect = workspace.getBoundingClientRect();
            const scrollLeft = workspace.scrollLeft;
            const scrollTop = workspace.scrollTop;
            
            // Calculate position in workspace
            const x = upEvent.clientX - workspaceRect.left + scrollLeft - offsetX;
            const y = upEvent.clientY - workspaceRect.top + scrollTop - offsetY;
            
            // Create actual block in workspace
            const newBlock = createBlockInWorkspace(block, x, y);
            
            // Check for connections after creation
            checkForConnectionsOnDrop(newBlock);
        }
        
        // Remove drag clone
        cleanBlock.remove();
        
        // Reset dragging state
        isDraggingFromPalette = false;
        workspace.classList.remove('drag-over');
    }
}

// Проверяем, находится ли событие над элементом
function isOverElement(event, element) {
    const rect = element.getBoundingClientRect();
    return (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
    );
}

// Обновить позиции всех блоков в цепочке
function refreshBlockChainPositions(topBlock) {
    // Находим все блоки, соединенные снизу
    const connectedBlocks = findConnectedBlocksBelow(topBlock);
    if (connectedBlocks.length === 0) return;
    
    // Получаем начальную позицию верхнего блока
    let currentX = parseInt(topBlock.style.left) || 0;
    let currentY = parseInt(topBlock.style.top) || 0;
    
    // Позиционируем все последующие блоки
    for (const block of connectedBlocks) {
        const currentRect = topBlock.getBoundingClientRect();
        
        // Вычисляем новую позицию Y с учетом высоты предыдущего блока
        currentY = currentY + currentRect.height;
        
        // Устанавливаем позицию блока
        block.style.left = currentX + 'px';
        block.style.top = currentY + 'px';
    }
}

// Find the closest block for connection
function findClosestBlockForConnection(block) {
    // Если блок уже в цепочке, не ищем соединения
    if (block.classList.contains('connected-top') || 
        block.classList.contains('connected-bottom') || 
        block.classList.contains('chain-member')) {
        return null;
    }

    const allBlocks = Array.from(document.querySelectorAll('.scripts-workspace .block'));
    let closestBlock = null;
    let minDistance = Infinity;

    allBlocks.forEach(otherBlock => {
        // Пропускаем текущий блок и блоки в цепочке
        if (otherBlock === block || 
            otherBlock.classList.contains('connected-top') || 
            otherBlock.classList.contains('connected-bottom') || 
            otherBlock.classList.contains('chain-member')) {
            return;
        }

        if (canConnectBlocks(block, otherBlock)) {
            const rect1 = block.getBoundingClientRect();
            const rect2 = otherBlock.getBoundingClientRect();
            const distance = Math.abs(rect1.bottom - rect2.top);
            
            if (distance < minDistance) {
                minDistance = distance;
                closestBlock = otherBlock;
            }
        }
    });

    return closestBlock;
}

// Check if block A is connected to block B
    isRunning = true;
    
    // Update UI
    document.querySelector('.run-btn').style.display = 'none';
    document.querySelector('.stop-btn').style.display = 'inline-block';
    
    // Highlight all start blocks
    startBlocks.forEach(block => {
        block.classList.add('executing');
        
        // Get all blocks connected to this start block
        const connectedBlocks = findConnectedBlocksBelow(block);
        if (connectedBlocks.length > 0) {
            executeBlockChain([block, ...connectedBlocks]);
        }
    });


// Stop script execution
function stopExecution() {
    isRunning = false;
    
    // Clear any pending timeouts
    clearTimeout(scriptTimeout);
    
    // Update UI
    document.querySelector('.run-btn').style.display = 'inline-block';
    document.querySelector('.stop-btn').style.display = 'none';
    
    // Remove execution highlights
    document.querySelectorAll('.executing').forEach(block => {
        block.classList.remove('executing');
    });
    
    // Reset any ongoing operations
    currentScriptBlocks = [];
}

// Execute a chain of blocks
function executeBlockChain(blocks) {
    if (!isRunning || blocks.length === 0) return;
    
    currentScriptBlocks = blocks;
    executeNextBlock(0);
}

// Execute a specific block in the chain
function executeNextBlock(index) {
    if (!isRunning || index >= currentScriptBlocks.length) return;
    
    const block = currentScriptBlocks[index];
    
    // Remove previous highlight
    if (index > 0) {
        currentScriptBlocks[index - 1].classList.remove('executing');
    }
    
    // Add highlight to current block
    block.classList.add('executing');
    
    // Get block text and type
    const text = block.querySelector('.block_text').textContent;
    const blockType = block.dataset.blockType;
    
    // Get input values from block
    const inputs = Array.from(block.querySelectorAll('.block-input')).map(input => input.value);
    
    // Execute block based on its text
    executeBlock(block, text, blockType, inputs)
        .then(delay => {
            // Move to next block after delay
            scriptTimeout = setTimeout(() => {
                executeNextBlock(index + 1);
            }, delay);
        })
        .catch(err => {
            console.error("Error executing block:", err);
            stopExecution();
        });
}

// Execute a single block
async function executeBlock(block, text, blockType, inputs) {
    console.log(`Executing: ${text} with inputs: ${inputs.join(', ')}`);
    
    // Default delay between blocks
    let delay = 300;
    
    // Check block text and execute corresponding action
    if (text.includes('ждать')) {
        const seconds = parseFloat(inputs[0]) || 1;
        delay = seconds * 1000;
    } 
    else if (text.includes('переместить курсор в точку')) {
        const x = parseInt(inputs[0]) || 0;
        const y = parseInt(inputs[1]) || 0;
        moveMouse(x, y);
    }
    else if (text.includes('переместить курсор по вертикали')) {
        const y = parseInt(inputs[0]) || 0;
        const currentX = parseInt(mouseCursor.style.left) || 0;
        moveMouse(currentX, y);
    }
    else if (text.includes('переместить курсор по горизонтали')) {
        const x = parseInt(inputs[0]) || 0;
        const currentY = parseInt(mouseCursor.style.top) || 0;
        moveMouse(x, currentY);
    }
    else if (text.includes('плыть курсором в точку')) {
        const x = parseInt(inputs[0]) || 0;
        const y = parseInt(inputs[1]) || 0;
        const seconds = parseFloat(inputs[2]) || 1;
        await animateMouse(x, y, seconds * 1000);
        delay = 0; // No additional delay needed
    }
    else if (text.includes('плыть курсором по вертикали')) {
        const y = parseInt(inputs[0]) || 0;
        const currentX = parseInt(mouseCursor.style.left) || 0;
        const seconds = parseFloat(inputs[1]) || 1;
        await animateMouse(currentX, y, seconds * 1000);
        delay = 0;
    }
    else if (text.includes('плыть курсором по горизонтали')) {
        const x = parseInt(inputs[0]) || 0;
        const currentY = parseInt(mouseCursor.style.top) || 0;
        const seconds = parseFloat(inputs[1]) || 1;
        await animateMouse(x, currentY, seconds * 1000);
        delay = 0;
    }
    else if (text.includes('нажать на клавишу')) {
        const key = inputs[0];
        simulateKeyPress(key);
    }
    else if (text.includes('зажать на клавишу') && !text.includes('на (s)')) {
        const key = inputs[0];
        simulateKeyDown(key);
    }
    else if (text.includes('отжать клавишу')) {
        const key = inputs[0];
        simulateKeyUp(key);
    }
    else if (text.includes('зажать на клавишу') && text.includes('на (s)')) {
        const key = inputs[0];
        const seconds = parseFloat(inputs[1]) || 1;
        simulateKeyDown(key);
        await new Promise(resolve => setTimeout(resolve, seconds * 1000));
        simulateKeyUp(key);
    }
    else if (text.includes('нажать (hotkey)')) {
        const hotkey = inputs[0];
        simulateHotkey(hotkey);
    }
    else if (text.includes('повторить цикл') && text.includes('раз')) {
        // Execute loop blocks
        await executeLoop(block, parseInt(inputs[0]) || 1);
        delay = 0;
    }
    else if (text.includes('повторять цикл всегда')) {
        // Infinite loop - we'll limit it for safety
        await executeLoop(block, 100, true);
        delay = 0;
    }
    else if (text.includes('если') && text.includes('то') && !text.includes('иначе')) {
        // Condition block
        await executeCondition(block, inputs[0]);
        delay = 0;
    }
    else if (text.includes('если') && text.includes('то') && text.includes('иначе')) {
        // If-else block
        await executeIfElse(block, inputs[0]);
        delay = 0;
    }
    else if (blockType === 'blue' || blockType === 'green') {
        // Information/math blocks - nothing to execute
        delay = 100;
    }
    
    return delay;
}

// Execute loop blocks
async function executeLoop(loopBlock, iterations, isInfinite = false) {
    // Find connected blocks inside the loop
    const connectedBlocks = findBlocksInsideLoop(loopBlock);
    
    if (connectedBlocks.length === 0) return;
    
    // Maximum iterations for safety
    const maxIterations = isInfinite ? 100 : iterations;
    
    // Execute loop
    for (let i = 0; i < maxIterations; i++) {
        if (!isRunning) break;
        
        // Show loop counter
        showLoopCounter(loopBlock, i + 1, maxIterations);
        
        // Execute each block in the loop
        for (let j = 0; j < connectedBlocks.length; j++) {
            if (!isRunning) break;
            
            const block = connectedBlocks[j];
            
            // Highlight current block
            block.classList.add('executing');
            
            // Remove highlight from other blocks
            connectedBlocks.forEach((b, index) => {
                if (index !== j) b.classList.remove('executing');
            });
            
            // Get block details
            const text = block.querySelector('.block_text').textContent;
            const blockType = block.dataset.blockType;
            const inputs = Array.from(block.querySelectorAll('.block-input')).map(input => input.value);
            
            // Execute block
            const delay = await executeBlock(block, text, blockType, inputs);
            
            // Wait for the specified delay
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Remove all highlights
        connectedBlocks.forEach(b => b.classList.remove('executing'));
        
        // Check if we should stop infinite loop
        if (isInfinite && i === maxIterations - 1) {
            if (confirm('Бесконечный цикл выполнил 100 итераций. Продолжить?')) {
                i = 0; // Reset counter to continue
            } else {
                break;
            }
        }
    }
    
    // Remove loop counter
    hideLoopCounter(loopBlock);
}

// Find blocks inside a loop
function findBlocksInsideLoop(loopBlock) {
    // For loop blocks in this implementation, indented blocks
    // will be placed directly below the loop block
    // We'll get the first block below and all its chain
    
    // Get the loop block position
    const loopRect = loopBlock.getBoundingClientRect();
    
    // Find blocks that might be inside the loop
    const allBlocks = Array.from(scriptWorkspace.querySelectorAll('.block'));
    
    // Find the first block directly below the loop
    const firstBlockInLoop = allBlocks.find(block => {
        if (block === loopBlock) return false;
        
        const blockRect = block.getBoundingClientRect();
        
        // Block must be below the loop
        const isBelow = Math.abs(blockRect.top - loopRect.bottom) < 15;
        
        // Block must be aligned with the loop
        const isAligned = Math.abs(blockRect.left - loopRect.left - 20) < 10;
        
        return isBelow && isAligned;
    });
    
    if (!firstBlockInLoop) return [];
    
    // Get the chain of blocks starting from the first block
    const chainBlocks = [firstBlockInLoop, ...findConnectedBlocksBelow(firstBlockInLoop)];
    
    return chainBlocks;
}

// Show loop counter
function showLoopCounter(loopBlock, current, total) {
    // Remove existing counter
    hideLoopCounter(loopBlock);
    
    // Create counter element
    const counter = document.createElement('div');
    counter.className = 'loop-counter';
    counter.textContent = `${current}/${total}`;
    counter.style.position = 'absolute';
    counter.style.top = `${loopBlock.offsetTop + 5}px`;
    counter.style.right = `${loopBlock.offsetLeft + 20}px`;
    counter.style.backgroundColor = 'rgba(255, 183, 0, 0.9)';
    counter.style.color = 'black';
    counter.style.padding = '2px 6px';
    counter.style.borderRadius = '10px';
    counter.style.fontSize = '12px';
    counter.style.fontWeight = 'bold';
    counter.style.zIndex = '1001';
    
    scriptWorkspace.appendChild(counter);
}

// Hide loop counter
function hideLoopCounter(loopBlock) {
    const counters = scriptWorkspace.querySelectorAll('.loop-counter');
    counters.forEach(counter => counter.remove());
}

// Execute condition block
async function executeCondition(conditionBlock, conditionText) {
    // Evaluate the condition
    const conditionResult = evaluateCondition(conditionText);
    
    // Highlight condition result
    showConditionResult(conditionBlock, conditionResult);
    
    if (conditionResult) {
        // Find blocks inside the condition
        const innerBlocks = findBlocksInsideCondition(conditionBlock);
        
        // Execute inner blocks
        for (let i = 0; i < innerBlocks.length; i++) {
            if (!isRunning) break;
            
            const block = innerBlocks[i];
            
            // Highlight current block
            block.classList.add('executing');
            
            // Remove highlight from other blocks
            innerBlocks.forEach((b, index) => {
                if (index !== i) b.classList.remove('executing');
            });
            
            // Execute block
            const text = block.querySelector('.block_text').textContent;
            const blockType = block.dataset.blockType;
            const inputs = Array.from(block.querySelectorAll('.block-input')).map(input => input.value);
            
            const delay = await executeBlock(block, text, blockType, inputs);
            
            // Wait for the delay
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Remove all highlights
        innerBlocks.forEach(b => b.classList.remove('executing'));
    }
    
    // Hide condition result after delay
    setTimeout(() => {
        hideConditionResult(conditionBlock);
    }, 1000);
}

// Execute if-else block
async function executeIfElse(ifElseBlock, conditionText) {
    // Evaluate the condition
    const conditionResult = evaluateCondition(conditionText);
    
    // Highlight condition result
    showConditionResult(ifElseBlock, conditionResult);
    
    // Find blocks for "if" and "else" parts
    const { ifBlocks, elseBlocks } = findBlocksInIfElse(ifElseBlock);
    
    // Execute the appropriate blocks
    const blocksToExecute = conditionResult ? ifBlocks : elseBlocks;
    
    // Execute blocks
    for (let i = 0; i < blocksToExecute.length; i++) {
        if (!isRunning) break;
        
        const block = blocksToExecute[i];
        
        // Highlight current block
        block.classList.add('executing');
        
        // Remove highlight from other blocks
        blocksToExecute.forEach((b, index) => {
            if (index !== i) b.classList.remove('executing');
        });
        
        // Execute block
        const text = block.querySelector('.block_text').textContent;
        const blockType = block.dataset.blockType;
        const inputs = Array.from(block.querySelectorAll('.block-input')).map(input => input.value);
        
        const delay = await executeBlock(block, text, blockType, inputs);
        
        // Wait for the delay
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Remove all highlights
    blocksToExecute.forEach(b => b.classList.remove('executing'));
    
    // Hide condition result after delay
    setTimeout(() => {
        hideConditionResult(ifElseBlock);
    }, 1000);
}

// Find blocks inside condition
function findBlocksInsideCondition(conditionBlock) {
    // Similar to finding blocks inside a loop
    const conditionRect = conditionBlock.getBoundingClientRect();
    const allBlocks = Array.from(scriptWorkspace.querySelectorAll('.block'));
    
    const firstBlockInCondition = allBlocks.find(block => {
        if (block === conditionBlock) return false;
        
        const blockRect = block.getBoundingClientRect();
        
        // Block must be below the condition
        const isBelow = Math.abs(blockRect.top - conditionRect.bottom) < 15;
        
        // Block must be indented from the condition
        const isIndented = Math.abs(blockRect.left - conditionRect.left - 20) < 10;
        
        return isBelow && isIndented;
    });
    
    if (!firstBlockInCondition) return [];
    
    // Get the chain of blocks
    return [firstBlockInCondition, ...findConnectedBlocksBelow(firstBlockInCondition)];
}

// Find blocks in if-else
function findBlocksInIfElse(ifElseBlock) {
    const ifElseRect = ifElseBlock.getBoundingClientRect();
    const allBlocks = Array.from(scriptWorkspace.querySelectorAll('.block'));
    
    // Find "if" part - first indented block
    const firstIfBlock = allBlocks.find(block => {
        if (block === ifElseBlock) return false;
        
        const blockRect = block.getBoundingClientRect();
        
        // Block must be below the if-else
        const isBelow = Math.abs(blockRect.top - ifElseRect.bottom) < 15;
        
        // Block must be indented from the if-else
        const isIndented = Math.abs(blockRect.left - ifElseRect.left - 20) < 10;
        
        return isBelow && isIndented;
    });
    
    let ifBlocks = [];
    if (firstIfBlock) {
        ifBlocks = [firstIfBlock, ...findConnectedBlocksBelow(firstIfBlock)];
    }
    
    // Find "else" part - first block after the if part
    let elseBlocks = [];
    if (ifBlocks.length > 0) {
        const lastIfBlock = ifBlocks[ifBlocks.length - 1];
        const lastIfRect = lastIfBlock.getBoundingClientRect();
        
        const firstElseBlock = allBlocks.find(block => {
            if (block === ifElseBlock || ifBlocks.includes(block)) return false;
            
            const blockRect = block.getBoundingClientRect();
            
            // Block must be below the last if block
            const isBelow = Math.abs(blockRect.top - lastIfRect.bottom) < 15;
            
            // Block must be aligned with the if-else block
            const isAligned = Math.abs(blockRect.left - ifElseRect.left - 20) < 10;
            
            return isBelow && isAligned;
        });
        
        if (firstElseBlock) {
            elseBlocks = [firstElseBlock, ...findConnectedBlocksBelow(firstElseBlock)];
        }
    }
    
    return { ifBlocks, elseBlocks };
}

// Show condition result
function showConditionResult(conditionBlock, result) {
    // Remove existing results
    hideConditionResult(conditionBlock);
    
    // Create result element
    const resultElement = document.createElement('div');
    resultElement.className = 'condition-result';
    resultElement.textContent = result ? '✓' : '✗';
    resultElement.style.position = 'absolute';
    resultElement.style.top = `${conditionBlock.offsetTop + 5}px`;
    resultElement.style.right = `${conditionBlock.offsetLeft + 20}px`;
    resultElement.style.backgroundColor = result ? 'rgba(76, 175, 80, 0.9)' : 'rgba(244, 67, 54, 0.9)';
    resultElement.style.color = 'white';
    resultElement.style.padding = '2px 6px';
    resultElement.style.borderRadius = '10px';
    resultElement.style.fontSize = '12px';
    resultElement.style.fontWeight = 'bold';
    resultElement.style.zIndex = '1001';
    
    scriptWorkspace.appendChild(resultElement);
}

// Hide condition result
function hideConditionResult(conditionBlock) {
    const results = scriptWorkspace.querySelectorAll('.condition-result');
    results.forEach(result => result.remove());
}

// Evaluate condition
function evaluateCondition(condition) {
    if (!condition) return false;
    
    // Simple condition evaluation
    if (condition.includes('>')) {
        const [left, right] = condition.split('>').map(s => parseFloat(s.trim()));
        return left > right;
    }
    else if (condition.includes('<')) {
        const [left, right] = condition.split('<').map(s => parseFloat(s.trim()));
        return left < right;
    }
    else if (condition.includes('=')) {
        const [left, right] = condition.split('=').map(s => s.trim());
        return left == right;
    }
    else if (condition.includes('И')) {
        const [left, right] = condition.split('И').map(s => evaluateCondition(s.trim()));
        return left && right;
    }
    else if (condition.includes('ИЛИ')) {
        const [left, right] = condition.split('ИЛИ').map(s => evaluateCondition(s.trim()));
        return left || right;
    }
    else if (condition.includes('НЕ')) {
        const value = condition.replace('НЕ', '').trim();
        return !evaluateCondition(value);
    }
    else if (condition.toLowerCase() === 'true' || condition === '1') {
        return true;
    }
    else if (condition.toLowerCase() === 'false' || condition === '0') {
        return false;
    }
    
    // Default to false for any other condition
    return Boolean(condition);
}

/**
 * Добавляет кнопку удаления к блоку
 * @param {HTMLElement} block - Блок, к которому добавляется кнопка
 */
function addDeleteButton(block) {
    // Проверяем, не является ли блок призраком и нет ли уже кнопки удаления
    if (block.classList.contains('ghost') || block.querySelector('.block-delete')) {
        return;
    }
    
    const deleteButton = document.createElement('div');
    deleteButton.className = 'block-delete';
    deleteButton.innerHTML = '×';
    deleteButton.title = 'Удалить блок';
    
    deleteButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        // Находим все блоки в цепочке
        let blocksToDelete = [block];
        let currentBlock = block;
        
        // Собираем все блоки, соединенные снизу
        while (true) {
            const nextBlock = findLowerConnectedBlock(currentBlock);
            if (!nextBlock) break;
            blocksToDelete.push(nextBlock);
            currentBlock = nextBlock;
        }
        
        // Если блок соединен сверху, находим верхний блок цепочки
        let topBlock = block;
        while (true) {
            const upperBlock = findUpperConnectedBlock(topBlock);
            if (!upperBlock) break;
            blocksToDelete.unshift(upperBlock);
            topBlock = upperBlock;
        }
        
        // Определяем индекс текущего блока в цепочке
        const currentBlockIndex = blocksToDelete.indexOf(block);
        
        // Если это верхний блок (индекс 0), удаляем всю цепочку
        // Если это не верхний блок (индекс > 0), удаляем только этот блок и все блоки ниже
        const blocksToRemove = currentBlockIndex === 0 ? blocksToDelete : blocksToDelete.slice(currentBlockIndex);

        // Получаем размеры рабочей области
        const workspaceRect = document.querySelector('.scripts-workspace').getBoundingClientRect();
        
        // Подготавливаем блоки к удалению
        blocksToRemove.forEach((blockToDelete, index) => {
            // Отключаем все события мыши
            blockToDelete.style.pointerEvents = 'none';
            
            // Сохраняем текущие стили и позицию
            const rect = blockToDelete.getBoundingClientRect();
            
            // Вычисляем позицию относительно рабочей области
            const relativeLeft = rect.left - workspaceRect.left;
            const relativeTop = rect.top - workspaceRect.top;
            
            // Сохраняем текущие стили
            blockToDelete.style.position = 'absolute';
            blockToDelete.style.left = relativeLeft + 'px';
            blockToDelete.style.top = relativeTop + 'px';
            blockToDelete.style.width = rect.width + 'px';
            blockToDelete.style.height = rect.height + 'px';
            blockToDelete.style.transform = 'none';
            blockToDelete.style.margin = '0';
            blockToDelete.style.padding = '0';
            
            // Убираем все классы, которые могут влиять на позиционирование
            blockToDelete.classList.remove('connected-top', 'connected-bottom', 'chain-member');
            
            // Принудительно вызываем перерисовку
            void blockToDelete.offsetWidth;
            
            // Добавляем класс для анимации
            blockToDelete.classList.add('deleting');
        });

        // Ждем завершения анимации
        await new Promise(resolve => {
            // Используем requestAnimationFrame для более надежного отслеживания анимации
            const startTime = performance.now();
            const animate = (currentTime) => {
                const elapsed = currentTime - startTime;
                if (elapsed < 400) { // 400ms = длительность анимации
                    requestAnimationFrame(animate);
                } else {
                    resolve();
                }
            };
            requestAnimationFrame(animate);
        });

        // Удаляем блоки после завершения анимации
        blocksToRemove.forEach(blockToDelete => {
            if (blockToDelete && blockToDelete.parentNode) {
                blockToDelete.remove();
            }
        });
        
        // Если удалили не весь блок, а только часть цепочки, обновляем позиции оставшихся блоков
        if (currentBlockIndex > 0) {
            const upperBlock = blocksToDelete[currentBlockIndex - 1];
            updateBlockChainPositions(upperBlock);
        }
    });
    
    block.appendChild(deleteButton);
}

// Find parent block element
function findParentBlock(element) {
    while (element && !element.classList.contains('block')) {
        element = element.parentElement;
    }
    return element;
}

// Find all blocks connected below the given block
function findConnectedBlocksBelow(block) {
    const result = [];
    
    // Сначала проверяем наличие data-атрибутов соединения
    function findChainByAttributes(startBlock) {
        let chainBlocks = [];
        let currentBlock = startBlock;
        
        while (currentBlock) {
            // Ищем блок, присоединенный к нижней части текущего блока
            const connectedId = currentBlock.dataset.connectedTo;
            if (!connectedId) break;
            
            // Находим блок по ID
            const nextBlock = document.getElementById(connectedId);
            if (!nextBlock || chainBlocks.includes(nextBlock)) break;
            
            chainBlocks.push(nextBlock);
            currentBlock = nextBlock;
        }
        
        return chainBlocks;
    }
    
    // Пробуем найти цепочку по атрибутам
    const chainByAttributes = findChainByAttributes(block);
    if (chainByAttributes.length > 0) {
        return chainByAttributes;
    }
    
    // Если не нашли по атрибутам, используем геометрические вычисления
    // Get the current block's position
    const blockRect = block.getBoundingClientRect();
    
    // Get all blocks in the workspace
    const allBlocks = Array.from(scriptWorkspace.querySelectorAll('.block'));
    
    // Function to check if a block is directly below
    function isDirectlyBelow(upperBlock, lowerBlock) {
        const upperRect = upperBlock.getBoundingClientRect();
        const lowerRect = lowerBlock.getBoundingClientRect();
        
        // Check if horizontally aligned
        const isAligned = Math.abs(upperRect.left - lowerRect.left) < 10;
        
        // Check if vertically connected (top of lower block is near bottom of upper block)
        const isConnected = Math.abs(upperRect.bottom - lowerRect.top) < 5;
        
        return isAligned && isConnected;
    }
    
    // Start with the given block
    let currentBlock = block;
    
    // Find all blocks in the chain below this one
    while (true) {
        let foundNext = false;
        
        for (const testBlock of allBlocks) {
            if (testBlock !== currentBlock && !result.includes(testBlock) && testBlock !== block) {
                if (isDirectlyBelow(currentBlock, testBlock)) {
                    // При обнаружении связи сохраняем ее в атрибуты для будущего использования
                    currentBlock.dataset.connectedTo = testBlock.id;
                    testBlock.dataset.connectedFrom = currentBlock.id;
                    
                    result.push(testBlock);
                    currentBlock = testBlock;
                    foundNext = true;
                    break;
                }
            }
        }
        
        if (!foundNext) break;
    }
    
    return result;
}

// Clear all ghost previews
function clearGhostPreviews() {
    const previews = document.querySelectorAll('.ghost-preview');
    previews.forEach(preview => preview.remove());
}

// Show connection animation
function showConnectionAnimation(upperBlock, lowerBlock) {
    // Add connection flash animation
    const flashElement = document.createElement('div');
    flashElement.className = 'snap-highlight';
    
    // Position the flash element at the connection point
    const upperRect = upperBlock.getBoundingClientRect();
    
    // Add appropriate class based on position
    flashElement.classList.add('bottom');
    
    // Set position and dimensions
    upperBlock.appendChild(flashElement);
    
    // Trigger connection flash animation on both blocks
    upperBlock.classList.add('connection-flash');
    lowerBlock.classList.add('connection-flash');
    
    // Remove after animation completes
    setTimeout(() => {
        if (flashElement.parentNode) {
            flashElement.parentNode.removeChild(flashElement);
        }
        upperBlock.classList.remove('connection-flash');
        lowerBlock.classList.remove('connection-flash');
    }, 800);
}

// Обновляем функцию setupMouseVisualization
function setupMouseVisualization() {
    const mouseVisualization = document.querySelector('.mouse-visualization');
    const mouseCursor = document.querySelector('.mouse-cursor');
    const mouseCoordinates = document.querySelector('.mouse-coordinates');
    const mouseButtons = document.querySelectorAll('.mouse-button');
    const keyboardKeys = document.querySelectorAll('.key');
    
    let isMouseDown = false;
    let activeButton = null;
    
    // Обработка движения мыши
    document.addEventListener('mousemove', (e) => {
        const rect = mouseVisualization.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Обновляем позицию курсора только если мышь внутри области визуализации
        if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
            mouseCursor.style.left = `${x}px`;
            mouseCursor.style.top = `${y}px`;
            mouseCoordinates.textContent = `X: ${Math.round(x)}, Y: ${Math.round(y)}`;
            
            // Добавляем эффект при движении
            mouseCursor.style.transform = `translate(-50%, -50%) scale(1.1)`;
            setTimeout(() => {
                mouseCursor.style.transform = `translate(-50%, -50%) scale(1)`;
            }, 150);
        }
    });
    
    // Обработка нажатий кнопок мыши
        document.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        const button = e.button === 0 ? 'left' : e.button === 1 ? 'middle' : 'right';
        activeButton = document.querySelector(`.mouse-button[data-button="${button}"]`);
        if (activeButton) {
            activeButton.classList.add('pressed');
            // Добавляем эффект нажатия
            activeButton.style.transform = 'scale(0.95)';
            }
        });
        
    document.addEventListener('mouseup', () => {
        isMouseDown = false;
        if (activeButton) {
            activeButton.classList.remove('pressed');
            activeButton.style.transform = '';
            activeButton = null;
        }
    });
    
    // Обработка нажатий клавиш
    const pressedKeys = new Set();
    
    document.addEventListener('keydown', (e) => {
        if (pressedKeys.has(e.code)) return;
        pressedKeys.add(e.code);
        
        const key = document.querySelector(`.key[data-key="${e.code.toLowerCase()}"]`);
        if (key) {
            key.classList.add('pressed');
            // Добавляем эффект нажатия
            key.style.transform = 'scale(0.95)';
            
            // Добавляем звук нажатия (опционально)
            const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
            audio.volume = 0.1;
            audio.play().catch(() => {});
        }
    });
    
    document.addEventListener('keyup', (e) => {
        pressedKeys.delete(e.code);
        const key = document.querySelector(`.key[data-key="${e.code.toLowerCase()}"]`);
        if (key) {
            key.classList.remove('pressed');
            key.style.transform = '';
        }
    });
    
    // Добавляем эффект при наведении на кнопки мыши
    mouseButtons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            if (!isMouseDown) {
                button.style.transform = 'scale(1.05)';
            }
        });
        
        button.addEventListener('mouseleave', () => {
            if (!isMouseDown) {
                button.style.transform = '';
            }
        });
    });
    
    // Добавляем эффект при наведении на клавиши
    keyboardKeys.forEach(key => {
        key.addEventListener('mouseenter', () => {
            if (!pressedKeys.has(key.dataset.key)) {
                key.style.transform = 'scale(1.05)';
            }
        });
        
        key.addEventListener('mouseleave', () => {
            if (!pressedKeys.has(key.dataset.key)) {
                key.style.transform = '';
            }
        });
    });
    
    // Очистка при уходе с окна
    window.addEventListener('blur', () => {
        pressedKeys.clear();
        keyboardKeys.forEach(key => {
            key.classList.remove('pressed');
            key.style.transform = '';
        });
        if (activeButton) {
            activeButton.classList.remove('pressed');
            activeButton.style.transform = '';
            activeButton = null;
        }
    });
}

// Добавляем вызов setupMouseVisualization в конец файла
document.addEventListener('DOMContentLoaded', () => {
    setupMouseVisualization();
});

// Функция для изменения масштаба
function changeZoom(delta) {
    // Вычисляем новый масштаб с учетом шага
    const zoomFactor = delta > 0 ? (1 + ZOOM_STEP) : (1 - ZOOM_STEP);
    const newZoom = currentZoom * zoomFactor;
    
    // Проверяем границы масштаба
    if (newZoom >= MIN_ZOOM && newZoom <= MAX_ZOOM) {
        currentZoom = newZoom;
        updateZoom();
    }
}

// Функция установки конкретного значения масштаба
function setZoom(value) {
    // Преобразуем значение в число и проверяем границы
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
    if (newZoom !== currentZoom) {
        currentZoom = newZoom;
        updateZoom();
    }
}

// Функция обновления масштаба
function updateZoom() {
    const workspace = document.querySelector('.scripts-workspace');
    const zoomText = document.getElementById('zoom-level');
    
    // Обновляем текст с процентом масштаба
    zoomText.textContent = `${Math.round(currentZoom * 100)}%`;
    
    // Применяем масштаб к рабочей области
    workspace.style.transform = `scale(${currentZoom})`;
    workspace.style.transformOrigin = '0 0';
    
    // Обновляем размер сетки
    const gridSize = 20 * currentZoom;
    workspace.style.backgroundSize = `${gridSize}px ${gridSize}px`;
    
    // Обновляем позиции всех блоков с учетом нового масштаба
    const blocks = workspace.querySelectorAll('.block');
    blocks.forEach(block => {
        // Получаем текущие координаты блока
        const rect = block.getBoundingClientRect();
        const workspaceRect = workspace.getBoundingClientRect();
        
        // Вычисляем относительные координаты
        const x = (rect.left - workspaceRect.left) / currentZoom;
        const y = (rect.top - workspaceRect.top) / currentZoom;
        
        // Устанавливаем позицию без масштабирования (масштаб применяется через родителя)
        block.style.transform = `translate(${x}px, ${y}px)`;
        block.style.transformOrigin = '0 0';
    });
}

// Функция сброса масштаба
function resetZoom() {
    currentZoom = 1;
    updateZoom();
}

// Создание клона блока для перетаскивания
function createDragClone(sourceBlock) {
    const clone = sourceBlock.cloneNode(true);
    clone.id = 'drag-clone-' + Math.random().toString(36).substr(2, 9);
    clone.style.position = 'absolute';
    clone.style.zIndex = '1000';
    clone.style.opacity = '0.8';
    clone.style.pointerEvents = 'none';
    clone.style.transform = 'none';
    clone.style.width = sourceBlock.offsetWidth + 'px';
    clone.style.boxShadow = '0 8px 15px rgba(0,0,0,0.25)';
    return clone;
}

// Обновляем маппинг клавиш для поддержки обеих раскладок
const keyMap = {
    // Специальные клавиши
    ' ': 'space',
    'Shift': 'shiftleft',
    'Control': 'controlleft',
    'Alt': 'altleft',
    'Meta': 'metaleft',
    'ContextMenu': 'contextmenu',
    'CapsLock': 'capslock',
    'Enter': 'enter',
    'Tab': 'tab',
    'Backspace': 'backspace',
    'Escape': 'escape',
    'ArrowUp': 'arrowup',
    'ArrowDown': 'arrowdown',
    'ArrowLeft': 'arrowleft',
    'ArrowRight': 'arrowright',
    'Insert': 'insert',
    'Delete': 'delete',
    'Home': 'home',
    'End': 'end',
    'PageUp': 'pageup',
    'PageDown': 'pagedown',
    'NumLock': 'numlock',
    'ScrollLock': 'scrolllock',
    'Pause': 'pause',
    'PrintScreen': 'printscreen',
    'F1': 'f1',
    'F2': 'f2',
    'F3': 'f3',
    'F4': 'f4',
    'F5': 'f5',
    'F6': 'f6',
    'F7': 'f7',
    'F8': 'f8',
    'F9': 'f9',
    'F10': 'f10',
    'F11': 'f11',
    'F12': 'f12',
    
    // Русская раскладка
    'ф': 'a', 'и': 'b', 'с': 'c', 'в': 'd', 'у': 'e', 'а': 'f', 'п': 'g', 'р': 'h',
    'ш': 'i', 'о': 'j', 'л': 'k', 'д': 'l', 'ь': 'm', 'т': 'n', 'щ': 'o', 'з': 'p',
    'к': 'q', 'ы': 'r', 'е': 's', 'г': 't', 'м': 'u', 'ц': 'v', 'ч': 'w', 'н': 'x',
    'я': 'y', 'б': 'z', 'ю': '.', 'э': "'", 'х': '[', 'ъ': ']', 'ж': ';', 'ё': '`',
    
    // Цифры и символы
    '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '0': '0',
    '-': 'minus', '=': 'equal', '[': 'bracketleft', ']': 'bracketright', '\\': 'backslash',
    ';': 'semicolon', "'": 'quote', ',': 'comma', '.': 'period', '/': 'slash',
    
    // Символы русской раскладки, которые не совпадают с английскими буквами
    '/': 'slash', // / и . на одной клавише в русской раскладке
    '.': 'period', // . и , на одной клавише
    ',': 'comma'  // , и < на одной клавише
};

// Инициализация зум-контролов
function initZoomControls() {
    const zoomIn = document.getElementById('zoom-in');
    const zoomOut = document.getElementById('zoom-out');
    const zoomReset = document.createElement('div');
    zoomReset.className = 'zoom-control';
    zoomReset.textContent = '↺';
    zoomReset.title = 'Сбросить масштаб';
    
    // Создаем элемент для ввода масштаба
    const zoomText = document.getElementById('zoom-level');
    zoomText.contentEditable = true;
    zoomText.title = 'Нажмите для ввода значения масштаба';
    
    // Добавляем кнопку сброса после кнопки уменьшения
    zoomOut.parentNode.insertBefore(zoomReset, zoomOut.nextSibling);
    
    // Обработчики для кнопок масштабирования
    zoomIn.addEventListener('click', () => changeZoom(1));
    zoomOut.addEventListener('click', () => changeZoom(-1));
    zoomReset.addEventListener('click', resetZoom);
    
    // Обработчик для ручного ввода масштаба
    zoomText.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const value = parseFloat(zoomText.textContent) / 100;
            if (!isNaN(value)) {
                setZoom(value);
            }
            zoomText.blur();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            zoomText.textContent = `${Math.round(currentZoom * 100)}%`;
            zoomText.blur();
        }
    });
    
    // Обработчик потери фокуса
    zoomText.addEventListener('blur', () => {
        zoomText.textContent = `${Math.round(currentZoom * 100)}%`;
    });
    
    // Обработчик клика для редактирования
    zoomText.addEventListener('click', (e) => {
        e.preventDefault();
        const value = Math.round(currentZoom * 100);
        zoomText.textContent = value;
        // Выделяем текст для удобства редактирования
        const range = document.createRange();
        range.selectNodeContents(zoomText);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    });
    
    // Добавляем поддержку колесика мыши с Ctrl
    document.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            e.preventDefault();
            changeZoom(e.deltaY < 0 ? 1 : -1);
        }
    }, { passive: false });
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    initZoomControls();
    updateZoom();
});

// Функция для обновления z-index блока
function updateBlockZIndex(block) {
    // Находим все блоки в цепочке
    const chain = [];
    let currentBlock = block;
    
    // Поднимаемся вверх по цепочке
    while (currentBlock) {
        chain.unshift(currentBlock);
        currentBlock = findUpperConnectedBlock(currentBlock);
    }
    
    // Спускаемся вниз по цепочке
    currentBlock = findLowerConnectedBlock(block);
    while (currentBlock) {
        chain.push(currentBlock);
        currentBlock = findLowerConnectedBlock(currentBlock);
    }
    
    // Распределяем z-index по порядку в цепочке
    chain.forEach((block, index) => {
        block.style.zIndex = BASE_Z_INDEX + index + 1;
        
        // Кнопка удаления всегда на 5 уровней выше своего блока
        const deleteButton = block.querySelector('.block-delete');
        if (deleteButton) {
            deleteButton.style.zIndex = BASE_Z_INDEX + index + 6;
        }
    });
    
    // Обновляем BASE_Z_INDEX для следующего использования
    BASE_Z_INDEX += chain.length;
}

/**
 * Создает призрачный блок для предпросмотра соединения
 * @param {HTMLElement} sourceBlock - Блок, который перетаскивается
 * @param {HTMLElement} targetBlock - Блок, над которым будет отображаться призрак
 * @param {string} position - Позиция призрака ('top' или 'bottom')
 * @returns {HTMLElement} Созданный призрачный блок
 */
function createConnectionGhost(sourceBlock, targetBlock, position) {
    // Очищаем предыдущий призрак, если он есть
    clearConnectionGhost();
    
    // Создаем клон перетаскиваемого блока
    const ghost = sourceBlock.cloneNode(true);
    ghost.classList.add('connection-ghost');
    
    // Получаем координаты рабочей области и целевого блока
    const workspace = document.querySelector('.scripts-workspace');
    const workspaceRect = workspace.getBoundingClientRect();
    const targetRect = targetBlock.getBoundingClientRect();
    
    // Вычисляем позицию призрака
    const x = (targetRect.left - workspaceRect.left) / currentZoom;
    let y;
    
    if (position === 'top') {
        // Размещаем призрак над целевым блоком
        y = (targetRect.top - workspaceRect.top) / currentZoom - sourceBlock.offsetHeight + 15;
    } else { // position === 'bottom'
        // Размещаем призрак под целевым блоком
        y = (targetRect.bottom - workspaceRect.top) / currentZoom - 15;
    }
    
    // Устанавливаем позицию и размеры призрака
    ghost.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: ${sourceBlock.offsetWidth}px;
        transform: none;
        pointer-events: none;
    `;
    
    // Скрываем текст в призраке
    const ghostText = ghost.querySelector('.block_text');
    if (ghostText) {
        ghostText.style.display = 'none';
    }
    
    // Устанавливаем прозрачность через fill и stroke
    const svgPath = ghost.querySelector('.block-svg path');
    if (svgPath) {
        svgPath.setAttribute('fill', 'rgba(64, 64, 64, 0.3)');
        svgPath.setAttribute('stroke', 'rgba(32, 32, 32, 0.3)');
    }
    
    // Добавляем призрак в рабочую область
    workspace.appendChild(ghost);
    
    return ghost;
}

/**
 * Проверяет, находится ли мышь в области возможного соединения блоков
 * @param {HTMLElement} draggedBlock - Перетаскиваемый блок
 * @param {HTMLElement} targetBlock - Целевой блок
 * @param {number} mouseX - X-координата мыши (координаты окна)
 * @param {number} mouseY - Y-координата мыши (координаты окна)
 * @returns {Object} Объект с информацией о соединении { canConnect: boolean, position: 'top'|'bottom'|null }
 */
function isInConnectionArea(draggedBlock, targetBlock, mouseX, mouseY) {
    const targetRect = targetBlock.getBoundingClientRect();
    const draggedRect = draggedBlock.getBoundingClientRect();
    
    // Определяем центральные X-координаты блоков для проверки горизонтального выравнивания
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const draggedCenterX = draggedRect.left + draggedRect.width / 2;
    
    // Определяем допуск для горизонтального выравнивания (например, 40% ширины целевого блока)
    const horizontalTolerance = targetRect.width * 0.4;
    
    // Проверяем горизонтальное выравнивание
    const horizontallyAligned = Math.abs(targetCenterX - draggedCenterX) < horizontalTolerance;

    if (!horizontallyAligned) {
        return { canConnect: false, position: null };
    }
    
    // Определяем вертикальную область вокруг целевого блока, где возможно соединение
    const verticalBuffer = 40; // Буфер в пикселях выше и ниже целевого блока
    const connectionZoneTop = targetRect.top - verticalBuffer;
    const connectionZoneBottom = targetRect.bottom + verticalBuffer;

    // Проверяем, находится ли курсор мыши в вертикальной области соединения
    const mouseInVerticalZone = mouseY >= connectionZoneTop && mouseY <= connectionZoneBottom;

    if (mouseInVerticalZone) {
        // Если курсор в зоне и блоки горизонтально выровнены, проверяем, куда можно подключить

        // Определяем, находится ли перетаскиваемый блок выше целевого
        const isAboveTarget = draggedRect.bottom < targetRect.top + 15; // Допуск 15px

        // Определяем, находится ли перетаскиваемый блок ниже целевого
        const isBelowTarget = draggedRect.top > targetRect.bottom - 15; // Допуск 15px

        // Если перетаскиваемый блок выше целевого и его нижняя часть близка к верху целевого
        if (isAboveTarget && Math.abs(draggedRect.bottom - targetRect.top) < verticalBuffer + 15) {
             // Проверяем, что целевой блок может принимать соединение сверху
            if (targetBlock.classList.contains('can-connect-top')) {
                 // Предлагаем соединение с верхом целевого блока
            return { canConnect: true, position: 'top' };
        }
    }
    
        // Если перетаскиваемый блок ниже целевого и его верхняя часть близка к низу целевого
        if (isBelowTarget && Math.abs(draggedRect.top - targetRect.bottom) < verticalBuffer + 15) {
             // Проверяем, что целевой блок может отдавать соединение снизу
             // (или что перетаскиваемый блок может принимать соединение сверху, но это уже проверено выше)
             // Здесь логичнее проверить, может ли целевой блок отдавать соединение вниз
            if (targetBlock.classList.contains('can-connect-bottom')) {
                 // Предлагаем соединение с низом целевого блока
            return { canConnect: true, position: 'bottom' };
             }
        }
    }
    
    // Если ни одно условие не выполнено, соединение невозможно
    return { canConnect: false, position: null };
}

/**
 * Удаляет призрачный блок из рабочей области
 */
function clearConnectionGhost() {
    const existingGhost = document.querySelector('.connection-ghost');
    if (existingGhost) {
        existingGhost.remove();
    }
}

function isBlockConnectedTo(blockA, blockB) {
    const connectedBlocks = findConnectedBlocksBelow(blockA);
    return connectedBlocks.includes(blockB);
}

function checkForConnectionsOnDrop(block) {
    // Если блок уже в цепочке, не проверяем соединения
    if (block.classList.contains('connected-top') || 
        block.classList.contains('connected-bottom') || 
        block.classList.contains('chain-member')) {
        return;
    }

    // Get all blocks in the workspace
    const workspaceBlocks = Array.from(document.querySelectorAll('.scripts-workspace .block'))
        .filter(b => b !== block && 
            !b.classList.contains('connected-top') && 
            !b.classList.contains('connected-bottom') && 
            !b.classList.contains('chain-member'));
    
    // Find the closest block for connection
    const closestBlock = findClosestBlockForConnection(block);
    
    if (closestBlock) {
        // Determine which block is top and which is bottom
        const rect1 = block.getBoundingClientRect();
        const rect2 = closestBlock.getBoundingClientRect();
        const topBlock = rect1.top < rect2.top ? block : closestBlock;
        const bottomBlock = topBlock === block ? closestBlock : block;
        
        // Calculate exact position for perfect alignment
        const topRect = topBlock.getBoundingClientRect();
        const bottomRect = bottomBlock.getBoundingClientRect();
        
        // Get workspace for coordinate conversion
        const workspace = document.getElementById('scripts-workspace');
        const workspaceRect = workspace.getBoundingClientRect();
        
        // Position the blocks
        const newX = topRect.left - workspaceRect.left;
        const newY = topRect.top - workspaceRect.top;
        
        // Apply the new position to the top block
        topBlock.style.left = newX + 'px';
        topBlock.style.top = newY + 'px';
        
        // Position the bottom block directly below the top block
        bottomBlock.style.left = newX + 'px';
        bottomBlock.style.top = (newY + topRect.height) + 'px';
        
        // Add connection classes
        topBlock.classList.add('connected-bottom');
        bottomBlock.classList.add('connected-top');
        
        // Show connection animation
        showConnectionAnimation(topBlock, bottomBlock);
        
        // Add 'just-connected' class for smooth animation
        bottomBlock.classList.add('just-connected');
        setTimeout(() => {
            bottomBlock.classList.remove('just-connected');
        }, 300);
        
        // Play sound effect
        playConnectionSound();
        
        // Move any blocks that are connected below the bottom block
        const connectedBelow = findConnectedBlocksBelow(bottomBlock);
        if (connectedBelow.length > 0) {
            refreshBlockChainPositions(bottomBlock);
        }
    }
    
    // Clear any ghost previews
    clearGhostPreviews();
}