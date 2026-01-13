import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fridge-recipe-secret-key';

// Multer 설정
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('지원하지 않는 이미지 형식입니다.'));
    }
  }
});

// 미들웨어
app.use(express.static(join(__dirname, 'public')));
app.use(express.json());

// JWT 인증 미들웨어
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
    }
    req.user = user;
    next();
  });
}

// ===== 인증 API =====

// 회원가입
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
    }

    // 이메일 중복 체크
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: '이미 사용 중인 이메일입니다.' });
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const result = db.prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)').run(email, hashedPassword, name);

    const token = jwt.sign({ id: result.lastInsertRowid, email, name }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: result.lastInsertRowid, email, name } });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: '회원가입 중 오류가 발생했습니다.' });
  }
});

// 로그인
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 잘못되었습니다.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 잘못되었습니다.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
  }
});

// 현재 사용자 정보
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.prepare('SELECT id, email, name, preferences FROM users WHERE id = ?').get(req.user.id);
  if (user) {
    user.preferences = JSON.parse(user.preferences || '{}');
  }
  res.json({ user });
});

// 프로필 수정
app.put('/api/users/profile', authenticateToken, (req, res) => {
  try {
    const { name, preferences } = req.body;
    const userId = req.user.id;

    if (name) {
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, userId);
    }

    if (preferences) {
      db.prepare('UPDATE users SET preferences = ? WHERE id = ?').run(JSON.stringify(preferences), userId);
    }

    const updatedUser = db.prepare('SELECT id, email, name, preferences FROM users WHERE id = ?').get(userId);
    updatedUser.preferences = JSON.parse(updatedUser.preferences || '{}');

    res.json({ user: updatedUser, message: '프로필이 업데이트되었습니다.' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: '프로필 수정 중 오류가 발생했습니다.' });
  }
});

// ===== 레시피 저장 API =====

// 레시피 저장
app.post('/api/recipes/save', authenticateToken, (req, res) => {
  try {
    const { recipe, memo, category } = req.body;

    if (!recipe) {
      return res.status(400).json({ error: '레시피 정보가 필요합니다.' });
    }

    const result = db.prepare(
      'INSERT INTO saved_recipes (user_id, recipe, memo, category) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, JSON.stringify(recipe), memo || '', category || '기타');

    res.json({ id: result.lastInsertRowid, message: '레시피가 저장되었습니다.' });
  } catch (error) {
    console.error('Save recipe error:', error);
    res.status(500).json({ error: '레시피 저장 중 오류가 발생했습니다.' });
  }
});

// 저장된 레시피 목록
app.get('/api/recipes/saved', authenticateToken, (req, res) => {
  try {
    const recipes = db.prepare(
      'SELECT * FROM saved_recipes WHERE user_id = ? ORDER BY created_at DESC'
    ).all(req.user.id);

    const parsed = recipes.map(r => ({
      ...r,
      recipe: JSON.parse(r.recipe)
    }));

    res.json({ recipes: parsed });
  } catch (error) {
    console.error('Get recipes error:', error);
    res.status(500).json({ error: '레시피 조회 중 오류가 발생했습니다.' });
  }
});

// 레시피 삭제
app.delete('/api/recipes/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    const recipe = db.prepare('SELECT * FROM saved_recipes WHERE id = ? AND user_id = ?').get(id, req.user.id);
    if (!recipe) {
      return res.status(404).json({ error: '레시피를 찾을 수 없습니다.' });
    }

    db.prepare('DELETE FROM saved_recipes WHERE id = ?').run(id);

    res.json({ message: '레시피가 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete recipe error:', error);
    res.status(500).json({ error: '레시피 삭제 중 오류가 발생했습니다.' });
  }
});

// ===== 이미지 분석 API =====

app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '이미지를 업로드해주세요.' });
    }

    const base64Image = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-nano-12b-v2-vl:free',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `이 냉장고/식탁 사진에서 보이는 식재료들을 인식해주세요.
반드시 아래 JSON 형식으로만 응답해주세요. 다른 설명은 하지 마세요.
{"ingredients": ["재료1", "재료2", "재료3"]}`
            },
            {
              type: 'image_url',
              image_url: { url: dataUrl }
            }
          ]
        }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const content = data.choices?.[0]?.message?.content || '';

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return res.json({ ingredients: parsed.ingredients || [] });
      }
    } catch (parseError) {
      console.log('Raw response:', content);
    }

    res.json({ ingredients: [], raw: content });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: '이미지 분석 중 오류가 발생했습니다.' });
  }
});

// ===== 레시피 생성 API =====

app.post('/api/generate-recipe', async (req, res) => {
  try {
    const { ingredients, cuisine, difficulty, cookingTime, servings } = req.body;

    if (!ingredients || ingredients.length === 0) {
      return res.status(400).json({ error: '재료를 선택해주세요.' });
    }

    const prompt = `다음 재료로 만들 수 있는 ${cuisine || '아무'} 요리 레시피를 3개 추천해주세요.

재료: ${ingredients.join(', ')}
난이도: ${difficulty || '보통'}
조리시간: ${cookingTime || 30}분 이내
인원: ${servings || 2}인분

반드시 아래 JSON 형식으로만 응답해주세요. 다른 설명은 하지 마세요.
{
  "recipes": [
    {
      "name": "요리명",
      "description": "한 줄 설명",
      "ingredients": [{"name": "재료명", "amount": "양"}],
      "steps": ["조리 단계 1", "조리 단계 2"],
      "cookingTime": 15,
      "difficulty": "쉬움",
      "tips": "조리 팁"
    }
  ]
}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemma-3-27b-it:free',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error('API Error:', data.error);
      return res.status(500).json({ error: data.error.message });
    }

    let content = data.choices?.[0]?.message?.content || '';

    // DeepSeek R1의 <think>...</think> 태그 제거
    content = content.replace(/<think>[\s\S]*?<\/think>/gi, '');

    // markdown 코드 블록 제거
    content = content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '');

    // 앞뒤 공백 제거
    content = content.trim();

    try {
      // JSON 객체 찾기 (가장 바깥쪽 중괄호)
      const jsonMatch = content.match(/\{[\s\S]*"recipes"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.recipes && parsed.recipes.length > 0) {
          console.log('Successfully parsed', parsed.recipes.length, 'recipes');
          return res.json({ recipes: parsed.recipes });
        }
      }
    } catch (parseError) {
      console.log('JSON Parse Error:', parseError.message);
      console.log('Content after cleaning:', content.substring(0, 500));
    }

    // 파싱 실패 시 빈 배열과 함께 오류 반환
    console.log('Failed to parse recipes from response');
    res.json({ recipes: [], error: 'AI 응답을 파싱하지 못했습니다.' });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: '레시피 생성 중 오류가 발생했습니다.' });
  }
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
