import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// OpenRouter API 키 검증
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error('❌ 오류: OPENROUTER_API_KEY가 설정되지 않았습니다.');
  console.error('   .env 파일에 API 키를 추가해주세요.');
  process.exit(1);
}

// 미들웨어
app.use(express.static(join(__dirname, 'public')));
app.use(express.json());

// 감정 분석 및 공감 메시지 생성 API
app.post('/api/analyze', async (req, res) => {
  try {
    const { entry } = req.body;

    if (!entry || entry.trim().length === 0) {
      return res.status(400).json({ error: '일기 내용을 입력해주세요.' });
    }

    const prompt = `당신은 따뜻하고 공감 능력이 뛰어난 심리 상담사입니다.
사용자가 오늘 있었던 일을 한 줄로 작성했습니다.
이 내용을 읽고 감정을 분석하여 진심 어린 공감과 위로의 메시지를 전해주세요.

사용자의 일기: "${entry}"

반드시 아래 JSON 형식으로만 응답해주세요. 다른 설명은 하지 마세요.
{
  "emotion": "주요 감정 (예: 기쁨, 슬픔, 분노, 불안, 피로, 외로움, 설렘, 감사 등)",
  "emotionEmoji": "감정을 나타내는 이모지 하나",
  "intensity": "감정 강도 (1-10)",
  "empathyMessage": "2-3문장의 따뜻하고 진심 어린 공감 메시지",
  "advice": "상황에 맞는 부드러운 조언이나 격려 한 문장",
  "affirmation": "오늘 하루를 마무리하는 긍정 확언 한 문장"
}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemma-3-27b-it:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('API Error:', data.error);
      return res.status(500).json({ error: data.error.message || 'AI 서비스 오류가 발생했습니다.' });
    }

    let content = data.choices?.[0]?.message?.content || '';

    // <think> 태그 제거 (DeepSeek 모델용)
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '');

    // markdown 코드 블록 제거
    content = content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');
    content = content.trim();

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return res.json({
          success: true,
          analysis: {
            emotion: parsed.emotion || '알 수 없음',
            emotionEmoji: parsed.emotionEmoji || '💭',
            intensity: parsed.intensity || 5,
            empathyMessage: parsed.empathyMessage || '오늘 하루도 수고했어요.',
            advice: parsed.advice || '내일은 더 좋은 하루가 될 거예요.',
            affirmation: parsed.affirmation || '나는 충분히 잘하고 있어요.'
          }
        });
      }
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError.message);
    }

    // 파싱 실패 시 기본 응답
    res.json({
      success: true,
      analysis: {
        emotion: '복합적인 감정',
        emotionEmoji: '💭',
        intensity: 5,
        empathyMessage: '오늘 하루 정말 수고 많았어요. 당신의 이야기를 들을 수 있어서 기뻐요.',
        advice: '잠시 쉬어가며 자신을 돌봐주세요.',
        affirmation: '나는 매일 성장하고 있어요.'
      }
    });

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🌙 AI 공감 다이어리 서버 실행 중: http://localhost:${PORT}`);
});
