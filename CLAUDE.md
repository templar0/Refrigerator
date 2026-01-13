# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

냉장고 사진에서 재료를 인식하고 레시피를 추천하는 웹 애플리케이션.
OpenRouter API를 통해 AI 모델을 사용하여 이미지 분석 및 레시피 생성.

## Build & Development Commands

```bash
npm install    # 의존성 설치
npm start      # 서버 실행 (http://localhost:3000)
npm run dev    # 개발 모드 (--watch)
```

## Architecture

```
├── server.js          # Express 서버, API 엔드포인트
├── database.js        # SQLite 데이터베이스 설정
├── app.db             # SQLite 데이터 파일
├── public/
│   ├── index.html     # 메인 페이지
│   ├── style.css      # 스타일
│   └── app.js         # 클라이언트 로직
└── .env               # 환경변수 (OPENROUTER_API_KEY)
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/analyze-image | 이미지에서 재료 인식 |
| POST | /api/generate-recipe | 레시피 생성 |
| POST | /api/auth/register | 회원가입 |
| POST | /api/auth/login | 로그인 |
| GET | /api/auth/me | 현재 사용자 확인 |
| PUT | /api/users/profile | 프로필 수정 |
| POST | /api/recipes/save | 레시피 저장 |
| GET | /api/recipes/saved | 저장된 레시피 목록 |
| DELETE | /api/recipes/:id | 레시피 삭제 |

## AI Models (OpenRouter)

- 이미지 인식: `nvidia/nemotron-nano-12b-v2-vl:free`
- 레시피 생성: `google/gemma-3-27b-it:free`

## Database Schema

**users**: id, email, password, name, preferences (JSON), created_at
**saved_recipes**: id, user_id, recipe (JSON), memo, category, created_at

## UI Flow

1. **Step 1**: 냉장고 사진 업로드 (드래그앤드롭 또는 클릭)
2. **Step 2**: AI가 인식한 재료 확인/수정 + 레시피 옵션 선택 (요리종류, 난이도, 시간, 인원)
3. **Step 3**: 추천 레시피 목록 표시
   - 각 레시피 카드에 저장 버튼 (로그인 시)
   - 레시피 클릭 시 상세 모달
   - "다시 선택하기" / "처음으로" 버튼

## Features

- 회원가입/로그인 (JWT 인증)
- 프로필 설정 (식단 유형, 알레르기, 선호 요리)
- 레시피 저장/삭제
- 저장된 레시피 목록 조회

## Recent Updates

- 레시피 생성 모델 변경: `deepseek/deepseek-r1-0528:free` → `google/gemma-3-27b-it:free` (타임아웃 문제 해결)
- Step 3에 "처음으로" 버튼 추가
- 레시피 카드에 직접 저장 버튼 추가
