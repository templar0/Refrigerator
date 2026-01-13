// ===== 인증 관련 =====
let currentUser = null;
let authToken = localStorage.getItem('token');

// DOM 요소 - 인증
const userMenu = document.getElementById('userMenu');
const authMenu = document.getElementById('authMenu');
const userName = document.getElementById('userName');
const showLoginBtn = document.getElementById('showLoginBtn');
const showRegisterBtn = document.getElementById('showRegisterBtn');
const logoutBtn = document.getElementById('logoutBtn');
const savedRecipesBtn = document.getElementById('savedRecipesBtn');
const loginSection = document.getElementById('loginSection');
const registerSection = document.getElementById('registerSection');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const toRegister = document.getElementById('toRegister');
const toLogin = document.getElementById('toLogin');
const savedSection = document.getElementById('savedSection');
const savedRecipesList = document.getElementById('savedRecipesList');
const backToMainBtn = document.getElementById('backToMainBtn');
const modalActions = document.getElementById('modalActions');
const saveRecipeBtn = document.getElementById('saveRecipeBtn');
const profileBtn = document.getElementById('profileBtn');
const profileSection = document.getElementById('profileSection');
const profileForm = document.getElementById('profileForm');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const prefDiet = document.getElementById('prefDiet');
const prefAllergies = document.getElementById('prefAllergies');
const backFromProfileBtn = document.getElementById('backFromProfileBtn');

// DOM 요소 - 메인
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const previewArea = document.getElementById('previewArea');
const previewImage = document.getElementById('previewImage');
const removeBtn = document.getElementById('removeBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const loadingSection = document.getElementById('loadingSection');
const loadingText = document.getElementById('loadingText');
const step1 = document.getElementById('step1');
const step2 = document.getElementById('step2');
const step3 = document.getElementById('step3');
const ingredientsList = document.getElementById('ingredientsList');
const newIngredientInput = document.getElementById('newIngredient');
const addBtn = document.getElementById('addBtn');
const recipeBtn = document.getElementById('recipeBtn');
const recipesContainer = document.getElementById('recipesContainer');
const backBtn = document.getElementById('backBtn');
const homeBtn = document.getElementById('homeBtn');
const recipeModal = document.getElementById('recipeModal');
const modalClose = document.getElementById('modalClose');
const modalBody = document.getElementById('modalBody');

// 옵션 요소
const cuisineSelect = document.getElementById('cuisineSelect');
const difficultySelect = document.getElementById('difficultySelect');
const timeSelect = document.getElementById('timeSelect');
const servingsSelect = document.getElementById('servingsSelect');

let selectedFile = null;
let ingredients = [];
let recipes = [];
let currentRecipe = null;

// ===== 초기화 =====
async function init() {
  if (authToken) {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        currentUser = data.user;
        showLoggedInUI();
      } else {
        localStorage.removeItem('token');
        authToken = null;
      }
    } catch (e) {
      console.error('Auth check failed:', e);
    }
  }
}
init();

function showLoggedInUI() {
  authMenu.hidden = true;
  userMenu.hidden = false;
  userName.textContent = currentUser.name + '님';
}

function showLoggedOutUI() {
  authMenu.hidden = false;
  userMenu.hidden = true;
  currentUser = null;
  authToken = null;
}

function hideAllSections() {
  step1.hidden = true;
  step2.hidden = true;
  step3.hidden = true;
  loginSection.hidden = true;
  registerSection.hidden = true;
  savedSection.hidden = true;
  profileSection.hidden = true;
  loadingSection.hidden = true;
}

function showMainUI() {
  hideAllSections();
  step1.hidden = false;
}

// ===== 인증 UI 이벤트 =====
showLoginBtn.addEventListener('click', () => {
  hideAllSections();
  loginSection.hidden = false;
});

showRegisterBtn.addEventListener('click', () => {
  hideAllSections();
  registerSection.hidden = false;
});

toRegister.addEventListener('click', (e) => {
  e.preventDefault();
  loginSection.hidden = true;
  registerSection.hidden = false;
});

toLogin.addEventListener('click', (e) => {
  e.preventDefault();
  registerSection.hidden = true;
  loginSection.hidden = false;
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  showLoggedOutUI();
  showMainUI();
});

// ===== 로그인/회원가입 =====
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (res.ok) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('token', authToken);
      showLoggedInUI();
      showMainUI();
      loginForm.reset();
    } else {
      alert(data.error);
    }
  } catch (e) {
    alert('로그인 중 오류가 발생했습니다.');
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();

    if (res.ok) {
      authToken = data.token;
      currentUser = data.user;
      localStorage.setItem('token', authToken);
      showLoggedInUI();
      showMainUI();
      registerForm.reset();
    } else {
      alert(data.error);
    }
  } catch (e) {
    alert('회원가입 중 오류가 발생했습니다.');
  }
});

// ===== 저장된 레시피 =====
savedRecipesBtn.addEventListener('click', async () => {
  hideAllSections();
  savedSection.hidden = false;
  await loadSavedRecipes();
});

backToMainBtn.addEventListener('click', () => {
  showMainUI();
});

// ===== 프로필 =====
profileBtn.addEventListener('click', async () => {
  hideAllSections();
  profileSection.hidden = false;
  await loadProfile();
});

backFromProfileBtn.addEventListener('click', () => {
  showMainUI();
});

async function loadProfile() {
  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();

    if (data.user) {
      profileName.value = data.user.name || '';
      profileEmail.value = data.user.email || '';

      const prefs = data.user.preferences || {};
      prefDiet.value = prefs.diet || '';
      prefAllergies.value = (prefs.allergies || []).join(', ');

      // 선호 요리 체크박스 설정
      document.querySelectorAll('input[name="prefCuisine"]').forEach(cb => {
        cb.checked = (prefs.cuisines || []).includes(cb.value);
      });
    }
  } catch (e) {
    console.error('Load profile failed:', e);
  }
}

profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const cuisines = [];
  document.querySelectorAll('input[name="prefCuisine"]:checked').forEach(cb => {
    cuisines.push(cb.value);
  });

  const preferences = {
    diet: prefDiet.value,
    allergies: prefAllergies.value.split(',').map(s => s.trim()).filter(s => s),
    cuisines: cuisines
  };

  try {
    const res = await fetch('/api/users/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        name: profileName.value,
        preferences: preferences
      })
    });
    const data = await res.json();

    if (res.ok) {
      currentUser = data.user;
      userName.textContent = currentUser.name + '님';
      alert('프로필이 저장되었습니다!');
    } else {
      alert(data.error);
    }
  } catch (e) {
    alert('프로필 저장 중 오류가 발생했습니다.');
  }
});

async function loadSavedRecipes() {
  try {
    const res = await fetch('/api/recipes/saved', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();

    if (data.recipes.length === 0) {
      savedRecipesList.innerHTML = '<p class="empty-message">저장된 레시피가 없습니다.</p>';
      return;
    }

    savedRecipesList.innerHTML = data.recipes.map(item => `
      <div class="saved-recipe-card" data-id="${item.id}">
        <div class="info" data-recipe='${JSON.stringify(item.recipe)}'>
          <h4>${item.recipe.name}</h4>
          <span class="date">${new Date(item.created_at).toLocaleDateString('ko-KR')}</span>
        </div>
        <button class="delete-btn" data-id="${item.id}">🗑️</button>
      </div>
    `).join('');

    // 클릭 이벤트
    savedRecipesList.querySelectorAll('.info').forEach(el => {
      el.addEventListener('click', () => {
        const recipe = JSON.parse(el.dataset.recipe);
        showRecipeDetail(recipe, false);
      });
    });

    savedRecipesList.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('이 레시피를 삭제하시겠습니까?')) {
          await deleteRecipe(btn.dataset.id);
        }
      });
    });
  } catch (e) {
    console.error('Load saved recipes failed:', e);
  }
}

async function deleteRecipe(id) {
  try {
    const res = await fetch(`/api/recipes/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (res.ok) {
      await loadSavedRecipes();
    }
  } catch (e) {
    alert('삭제 중 오류가 발생했습니다.');
  }
}

// ===== 레시피 저장 =====
saveRecipeBtn.addEventListener('click', async () => {
  if (!currentRecipe) return;

  try {
    const res = await fetch('/api/recipes/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ recipe: currentRecipe })
    });
    const data = await res.json();

    if (res.ok) {
      alert('레시피가 저장되었습니다!');
      recipeModal.hidden = true;
    } else {
      alert(data.error);
    }
  } catch (e) {
    alert('저장 중 오류가 발생했습니다.');
  }
});

// ===== 이미지 업로드 =====
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    handleFile(file);
  }
});

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

function handleFile(file) {
  if (file.size > 5 * 1024 * 1024) {
    alert('파일 크기는 5MB 이하여야 합니다.');
    return;
  }

  selectedFile = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImage.src = e.target.result;
    uploadArea.hidden = true;
    previewArea.hidden = false;
    analyzeBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

removeBtn.addEventListener('click', () => {
  selectedFile = null;
  fileInput.value = '';
  previewArea.hidden = true;
  uploadArea.hidden = false;
  analyzeBtn.disabled = true;
});

// ===== 재료 인식 =====
analyzeBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  step1.hidden = true;
  loadingSection.hidden = false;
  loadingText.textContent = 'AI가 재료를 인식하고 있어요...';

  try {
    const formData = new FormData();
    formData.append('image', selectedFile);

    const response = await fetch('/api/analyze-image', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (data.error) {
      alert('오류: ' + data.error);
      step1.hidden = false;
      loadingSection.hidden = true;
      return;
    }

    ingredients = data.ingredients || [];
    renderIngredients();
    loadingSection.hidden = true;
    step2.hidden = false;

  } catch (error) {
    console.error('Error:', error);
    alert('재료 인식 중 오류가 발생했습니다.');
    step1.hidden = false;
    loadingSection.hidden = true;
  }
});

// ===== 재료 목록 =====
function renderIngredients() {
  ingredientsList.innerHTML = ingredients.map((ing, idx) => `
    <div class="ingredient-tag">
      <input type="checkbox" checked data-index="${idx}">
      <span>${ing}</span>
      <button class="remove" data-index="${idx}">×</button>
    </div>
  `).join('');

  ingredientsList.querySelectorAll('.remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.index);
      ingredients.splice(idx, 1);
      renderIngredients();
    });
  });
}

addBtn.addEventListener('click', addIngredient);
newIngredientInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addIngredient();
});

function addIngredient() {
  const value = newIngredientInput.value.trim();
  if (value && !ingredients.includes(value)) {
    ingredients.push(value);
    renderIngredients();
    newIngredientInput.value = '';
  }
}

// ===== 레시피 생성 =====
recipeBtn.addEventListener('click', async () => {
  const selectedIngredients = [];
  ingredientsList.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
    const idx = parseInt(cb.dataset.index);
    selectedIngredients.push(ingredients[idx]);
  });

  if (selectedIngredients.length === 0) {
    alert('최소 1개 이상의 재료를 선택해주세요.');
    return;
  }

  step2.hidden = true;
  loadingSection.hidden = false;
  loadingText.textContent = 'AI가 레시피를 생성하고 있어요...';

  try {
    const response = await fetch('/api/generate-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredients: selectedIngredients,
        cuisine: cuisineSelect.value,
        difficulty: difficultySelect.value,
        cookingTime: parseInt(timeSelect.value),
        servings: parseInt(servingsSelect.value)
      })
    });

    const data = await response.json();

    if (data.error) {
      alert('오류: ' + data.error);
      step2.hidden = false;
      loadingSection.hidden = true;
      return;
    }

    recipes = data.recipes || [];
    renderRecipes();
    loadingSection.hidden = true;
    step3.hidden = false;

  } catch (error) {
    console.error('Error:', error);
    alert('레시피 생성 중 오류가 발생했습니다.');
    step2.hidden = false;
    loadingSection.hidden = true;
  }
});

// ===== 레시피 목록 =====
function renderRecipes() {
  if (recipes.length === 0) {
    recipesContainer.innerHTML = '<p style="text-align:center;color:#888;">레시피를 생성하지 못했습니다. 다시 시도해주세요.</p>';
    return;
  }

  recipesContainer.innerHTML = recipes.map((recipe, idx) => `
    <div class="recipe-card" data-index="${idx}">
      <h3>${recipe.name}</h3>
      <p>${recipe.description}</p>
      <div class="recipe-meta">
        <span>⏱️ ${recipe.cookingTime}분</span>
        <span>📊 ${recipe.difficulty}</span>
      </div>
      ${currentUser ? `<button class="btn-save-card" data-index="${idx}">💾 저장</button>` : ''}
    </div>
  `).join('');

  recipesContainer.querySelectorAll('.recipe-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // 저장 버튼 클릭 시 모달 열지 않음
      if (e.target.classList.contains('btn-save-card')) return;
      const idx = parseInt(card.dataset.index);
      showRecipeDetail(recipes[idx], true);
    });
  });

  // 저장 버튼 이벤트
  recipesContainer.querySelectorAll('.btn-save-card').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index);
      await saveRecipeDirectly(recipes[idx], btn);
    });
  });
}

// 레시피 직접 저장
async function saveRecipeDirectly(recipe, btn) {
  try {
    const res = await fetch('/api/recipes/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ recipe })
    });
    const data = await res.json();

    if (res.ok) {
      btn.textContent = '✅ 저장됨';
      btn.disabled = true;
    } else {
      alert(data.error);
    }
  } catch (e) {
    alert('저장 중 오류가 발생했습니다.');
  }
}

// ===== 레시피 상세 모달 =====
function showRecipeDetail(recipe, showSave = true) {
  currentRecipe = recipe;

  const ingredientsList = recipe.ingredients?.map(ing =>
    `<li>${ing.name}: ${ing.amount}</li>`
  ).join('') || '';

  const stepsList = recipe.steps?.map(step =>
    `<li>${step}</li>`
  ).join('') || '';

  modalBody.innerHTML = `
    <h2>${recipe.name}</h2>
    <p class="description">${recipe.description}</p>

    <h4>재료</h4>
    <ul>${ingredientsList}</ul>

    <h4>조리 순서</h4>
    <ol>${stepsList}</ol>

    ${recipe.tips ? `
      <div class="tips-box">
        <p>💡 ${recipe.tips}</p>
      </div>
    ` : ''}
  `;

  // 로그인 상태이고 저장 버튼 표시가 필요한 경우만 표시
  modalActions.hidden = !(showSave && currentUser);
  recipeModal.hidden = false;
}

modalClose.addEventListener('click', () => {
  recipeModal.hidden = true;
});

recipeModal.addEventListener('click', (e) => {
  if (e.target === recipeModal) {
    recipeModal.hidden = true;
  }
});

// ===== 뒤로가기 & 처음으로 =====
backBtn.addEventListener('click', () => {
  step3.hidden = true;
  step2.hidden = false;
});

homeBtn.addEventListener('click', () => {
  // 상태 초기화
  selectedFile = null;
  fileInput.value = '';
  ingredients = [];
  recipes = [];
  previewArea.hidden = true;
  uploadArea.hidden = false;
  analyzeBtn.disabled = true;

  // 처음 화면으로
  hideAllSections();
  step1.hidden = false;
});
