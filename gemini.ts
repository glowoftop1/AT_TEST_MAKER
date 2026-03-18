import { QuizOptions, QuizData } from './types';

export const generateQuestions = async (
  fileData: any, 
  options: QuizOptions
): Promise<QuizData> => {
  // 1. 환경변수에서 API 키 가져오기
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    alert("Gemini API 키가 설정되지 않았습니다. Vercel에서 환경변수를 설정해주세요!");
    throw new Error("API Key is missing");
  }

  // 2. AI에게 내릴 명령(Prompt) 작성
  const prompt = `
    다음 내용을 분석하고 퀴즈를 만들어주세요.
    - 총 문제 수: ${options.totalCount}개
    - 내용: ${JSON.stringify(fileData)}
    
    반드시 아래의 JSON 형식으로만 답변을 출력해주세요. 다른 설명은 절대 하지 마세요.
    {
      "document_summary": "문서 전체 요약 내용",
      "questions":[
        {
          "id": 1,
          "type": "multiple_choice",
          "difficulty": "중",
          "question": "문제 내용?",
          "options":["보기1", "보기2", "보기3", "보기4"],
          "answer": "정답 텍스트",
          "explanation": "해설 내용"
        }
      ]
    }
  `;

  // 3. Gemini API 호출
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    throw new Error("API 호출 중 오류가 발생했습니다.");
  }

  const data = await response.json();
  const resultText = data.candidates[0].content.parts[0].text;
  
  // 4. 결과물 정리 후 반환
  const cleanText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleanText);
};
