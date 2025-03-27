function updateBlockSize(block) {
  const textElem = block.querySelector('.block_text');
  const svgElem = block.querySelector('.block-svg');
  const pathElem = svgElem.querySelector('path');
  
  const textWidth = Math.ceil(textElem.getBoundingClientRect().width);
  const baseWidth = block.classList.contains('orange-block') ? 158 : 130;
  const baseHeight = block.classList.contains('orange-block') ? 63 : 
                    block.classList.contains('blue-block') ? 50 : 43;

  const newWidth = Math.max(textWidth + 40, 100);
  const newHeight = baseHeight;

  svgElem.setAttribute('width', newWidth);
  svgElem.setAttribute('height', newHeight);
  svgElem.setAttribute('viewBox', `0 0 ${newWidth} ${newHeight}`);
  
  let newD;
  if (block.classList.contains('orange-block')) {
    const x = newWidth - 3;
    newD = `M3 55.5C1.89543 55.5 1 54.6046 1 53.5V15.6667C1 15.2339 1.13404 14.8209 1.4209 14.4969C3.63731 11.9935 14.8588 0.999979 41 1C66.5466 1.00002 78.5944 11.4991 81.3648 14.3131C81.7846 14.7396 82.3469 15 82.9454 15H${x}C${x + 1.105} 15 ${x + 2} 15.8954 ${x + 2} 17V53.5C${x + 2} 54.6046 ${x + 1.105} 55.5 ${x} 55.5H40.3284C39.798 55.5 39.2893 55.7107 38.9142 56.0858L33.0858 61.9142C32.7107 62.2893 32.202 62.5 31.6716 62.5H20.2883C19.7817 62.5 19.294 62.3078 18.9237 61.9621L12.5763 56.0379C12.206 55.6922 11.7183 55.5 11.2117 55.5H3Z`;
  } 
  else if (block.classList.contains('blue-block')) {
    const x = newWidth - 3;
    newD = `M3 42.0001C1.89543 42.0001 1 41.1046 1 40.0001V3.00001C1 1.89544 1.89544 1 3.00001 1.00001L11.2117 1.00006C11.7183 1.00006 12.206 1.1923 12.5763 1.53795L18.9237 7.46217C19.294 7.80782 19.7817 8.00006 20.2883 8.00006H31.6716C32.202 8.00006 32.7107 7.78935 33.0858 7.41427L38.9142 1.58585C39.2893 1.21077 39.798 1.00006 40.3284 1.00006L${x} 1C${x + 1.105} 1 ${x + 2} 1.89543 ${x + 2} 3V40.0001C${x + 2} 41.1046 ${x + 1.105} 42.0001 ${x} 42.0001H40.3284C39.798 42.0001 39.2893 42.2108 38.9142 42.5858L33.0858 48.4143C32.7107 48.7893 32.202 49.0001 31.6716 49.0001H20.2883C19.7817 49.0001 19.294 48.8078 18.9237 48.4622L12.5763 42.538C12.206 42.1923 11.7183 42.0001 11.2117 42.0001H3Z`;
  }
  else { // red-block
    const x = newWidth - 3;
    newD = `M3 42.0001C1.89543 42.0001 1 41.1046 1 40.0001V3.00001C1 1.89544 1.89544 1 3.00001 1.00001L11.2117 1.00006C11.7183 1.00006 12.206 1.1923 12.5763 1.53795L18.9237 7.46217C19.294 7.80782 19.7817 8.00006 20.2883 8.00006H31.6716C32.202 8.00006 32.7107 7.78935 33.0858 7.41427L38.9142 1.58585C39.2893 1.21077 39.798 1.00006 40.3284 1.00006L${x} 1C${x + 1.105} 1 ${x + 2} 1.89543 ${x + 2} 3V40.0001C${x + 2} 41.1046 ${x + 1.105} 42.0001 ${x} 42.0001H3Z`;
  }

  pathElem.setAttribute('d', newD);
}

  // Инициализация для всех блоков
  document.querySelectorAll('.block').forEach(block => {
    updateBlockSize(block);
    
    // Отслеживаем изменения в тексте
    const observer = new MutationObserver(() => updateBlockSize(block));
    observer.observe(block.querySelector('.block_text'), {
      childList: true,
      characterData: true,
      subtree: true
    });
  });

  function makeDraggable(element) {
    let isDragging = false;
    let startX, startY, initialX, initialY;
  
    element.addEventListener('mousedown', startDrag);
    
    function startDrag(e) {
      e.preventDefault();
      isDragging = true;
      
      // Получаем начальные координаты
      startX = e.clientX;
      startY = e.clientY;
      initialX = element.offsetLeft;
      initialY = element.offsetTop;
  
      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', stopDrag);
    }
  
    function drag(e) {
      if (!isDragging) return;
      
      // Рассчитываем новые координаты
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      element.style.left = `${initialX + deltaX}px`;
      element.style.top = `${initialY + deltaY}px`;
    }
  
    function stopDrag() {
      isDragging = false;
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', stopDrag);
    }
  }
  
  // Единая инициализация для всех блоков
  document.querySelectorAll('.block').forEach(block => {
    // Инициализируем размер
    updateBlockSize(block);
    
    // Делаем перетаскиваемым
    makeDraggable(block);
    
    // Настраиваем отслеживание изменений текста
    const observer = new MutationObserver(() => updateBlockSize(block));
    observer.observe(block.querySelector('.block_text'), {
      childList: true,
      characterData: true,
      subtree: true
    });
  });