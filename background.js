// 발급받으신 GAS 웹앱 URL을 여기에 붙여넣으세요.
const GAS_URL = "https://script.google.com/macros/s/AKfycbwZLjZbIVRaptAEW9z2Fv5eycDOoqzeHQvfMYxpmEkmJcyWXRR2KpNjIMphrd9_sfKgdg/exec";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translate") {
    const originalText = request.text;

    // 1. 크롬 로컬 스토리지(캐시) 확인
    chrome.storage.local.get([originalText], (result) => {
      if (result[originalText]) {
        // 2-A. 캐시에 이미 번역본이 있다면 즉시 반환 (API 호출 안 함)
        console.log("캐시 사용:", originalText);
        sendResponse({ translatedText: result[originalText] });
      } else {
        // 2-B. 캐시에 없다면 GAS(구글 번역) 호출
        // URL에 한글이나 특수문자가 들어갈 수 있으므로 encodeURIComponent 사용
        const fetchUrl = `${GAS_URL}?q=${encodeURIComponent(originalText)}&target=ko`;

        fetch(fetchUrl)
          .then(response => response.json())
          .then(data => {
            const translated = data.translatedText;
            
            // 3. 다음번을 위해 결과를 로컬 스토리지에 저장
            let cacheObj = {};
            cacheObj[originalText] = translated;
            chrome.storage.local.set(cacheObj);

            // 4. Content Script로 결과 응답
            sendResponse({ translatedText: translated });
          })
          .catch(error => {
            console.error("GAS 통신 에러:", error);
            sendResponse({ translatedText: null });
          });
      }
    });

    // fetch 비동기 응답 처리를 기다리기 위해 반드시 true를 반환해야 합니다.
    return true; 
  }
});
