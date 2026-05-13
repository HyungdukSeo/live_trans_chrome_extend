// 1. 오버레이를 담을 최상위 컨테이너 생성 및 추가
const overlayContainer = document.createElement('div');
overlayContainer.id = 'translation-overlay-container';
overlayContainer.style.cssText = `
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* 클릭 투과: 마우스 이벤트가 뒤쪽 웹페이지로 통과됨 */
  z-index: 2147483647; /* 화면 최상단 보장 */
`;
document.body.appendChild(overlayContainer);

// 배경색을 찾는 헬퍼 함수 (투명한 배경일 경우 부모 노드를 타고 올라가며 색상을 찾음)
function getActualBackgroundColor(element) {
  let transparent = 'rgba(0, 0, 0, 0)';
  let bg = window.getComputedStyle(element).backgroundColor;
  
  if (bg !== transparent) return bg;
  
  let parent = element.parentElement;
  while (parent) {
    bg = window.getComputedStyle(parent).backgroundColor;
    if (bg !== transparent) return bg;
    parent = parent.parentElement;
  }
  return 'white'; // 끝까지 못 찾으면 기본 흰색 배경
}

// 2. 텍스트 노드를 찾아 오버레이를 생성하는 함수
function translateAndOverlay(textNode) {
  const text = textNode.textContent.trim();
  // 번역할 가치가 없는 짧은 텍스트나 공백은 스킵
  if (!text || text.length < 2) return; 

  const parentElement = textNode.parentElement;
  if (!parentElement) return;

  // Background Script로 번역 요청 전송 (GAS API 연동)
  chrome.runtime.sendMessage({ action: "translate", text: text }, (response) => {
    if (response && response.translatedText) {
      // 텍스트 노드를 감싸는 임시 Range 객체 생성하여 정확한 좌표(바운딩 박스) 획득
      const range = document.createRange();
      range.selectNode(textNode);
      const rect = range.getBoundingClientRect();

      // 화면에 보이지 않거나 크기가 없는 경우 무시
      if (rect.width === 0 || rect.height === 0) return;

      // 원본 텍스트의 부모 요소 스타일(폰트 크기, 줄 간격 등)을 최대한 똑같이 복사
      const computedStyle = window.getComputedStyle(parentElement);
      const bgColor = getActualBackgroundColor(parentElement);

      // 오버레이 엘리먼트 생성
      const overlayElem = document.createElement('div');
      overlayElem.style.cssText = `
        position: absolute;
        left: ${rect.left + window.scrollX}px;
        top: ${rect.top + window.scrollY}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        
        /* 추출한 원본 스타일 적용 */
        font-family: ${computedStyle.fontFamily};
        font-size: ${computedStyle.fontSize};
        font-weight: ${computedStyle.fontWeight};
        line-height: ${computedStyle.lineHeight};
        color: ${computedStyle.color};
        text-align: ${computedStyle.textAlign};
        
        /* 원본 글씨를 가리기 위한 불투명 배경 */
        background-color: ${bgColor}; 
        
        display: flex;
        align-items: center;
        justify-content: ${computedStyle.textAlign === 'center' ? 'center' : 'flex-start'};
        overflow: hidden;
        white-space: normal;
        border-radius: 2px;
      `;
      
      overlayElem.textContent = response.translatedText;
      overlayContainer.appendChild(overlayElem);
    }
  });
}

// 3. MutationObserver 설정 (동적 콘텐츠 감시)
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      // 텍스트 노드인 경우 번역 처리
      if (node.nodeType === Node.TEXT_NODE) {
          translateAndOverlay(node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
          // 엘리먼트가 추가된 경우 그 안의 모든 텍스트 노드를 탐색
          const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
          let textNode;
          while (textNode = walker.nextNode()) {
              translateAndOverlay(textNode);
          }
      }
    });
  });
});

// body 전체의 구조 변경을 실시간으로 감시
observer.observe(document.body, { childList: true, subtree: true });

// 4. 초기 로딩 시 기존 텍스트 처리
const initialWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
let initialNode;
while (initialNode = initialWalker.nextNode()) {
  translateAndOverlay(initialNode);
}
