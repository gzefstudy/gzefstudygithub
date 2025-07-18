import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getFirestore, collection, getDocs, query, limit, startAfter, orderBy, where, doc, setDoc, addDoc, updateDoc, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

// LANGUAGE CODE SUMMARY TABLE
// | Language Name | Document ID | Use in Topic `language` field |
// |---------------|-------------|-------------------------------|
// | English       | En          | "En"                          |
// | Hindi         | Hi          | "Hi"                          |
// | Gujarati      | gu          | "gu"                          |
// | Japanese      | ja          | "ja"                          |
// | Spanish       | Es          | "Es"                          |
// Wait for DOM to be ready before running any code
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing app...');

  // Your Firebase config (should match home.html)
  const firebaseConfig = {
    apiKey: "AIzaSyChl4C-kSRTSmJv5pfrV4dbVzjBFwaCc8I",
    authDomain: "gzefstudy-9cd9d.firebaseapp.com",
    projectId: "gzefstudy-9cd9d",
    storageBucket: "gzefstudy-9cd9d.firebasestorage.app",
    messagingSenderId: "312445375090",
    appId: "1:312445375090:web:e3a0b166b5aa5569eba8eb",
    measurementId: "G-1HE8LK2BKV"
  };
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  // Configure Firestore to use HTTP/2 instead of HTTP/3 to avoid QUIC errors
  const firestoreSettings = {
    experimentalForceLongPolling: true,
    useFetchStreams: false
  };
  
  // Initialize Firestore with settings
  const dbWithSettings = getFirestore(app);
  // Note: Firestore settings are applied globally, so this should help with the connection

  // Database Management Functions
  async function addTopicToDatabase(topicData) {
    try {
      // Add searchable fields for better filtering
      const enhancedTopicData = {
        ...topicData,
        searchableTitle: topicData.title.toLowerCase(),
        searchableDescription: topicData.description.toLowerCase(),
        searchableLanguage: topicData.language.toLowerCase(),
        searchableTags: (topicData.tags || []).map(tag => tag.toLowerCase()),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const docRef = await addDoc(collection(db, "Topics"), enhancedTopicData);
      console.log("Topic added with ID: ", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("Error adding topic: ", error);
      throw error;
    }
  }

  async function updateTopicInDatabase(topicId, updateData) {
    try {
      const topicRef = doc(db, "Topics", topicId);
      
      const enhancedUpdateData = {
        ...updateData,
        searchableTitle: updateData.title ? updateData.title.toLowerCase() : undefined,
        searchableDescription: updateData.description ? updateData.description.toLowerCase() : undefined,
        searchableLanguage: updateData.language ? updateData.language.toLowerCase() : undefined,
        searchableTags: updateData.tags ? updateData.tags.map(tag => tag.toLowerCase()) : undefined,
        updatedAt: new Date()
      };
      
      await updateDoc(topicRef, enhancedUpdateData);
      console.log("Topic updated successfully");
    } catch (error) {
      console.error("Error updating topic: ", error);
      throw error;
    }
  }

  async function addLanguageToDatabase(languageData) {
    try {
      const enhancedLanguageData = {
        ...languageData,
        searchableName: languageData.name.toLowerCase(),
        searchableNativeName: languageData.nativeName ? languageData.nativeName.toLowerCase() : undefined,
        createdAt: new Date()
      };
      
      const docRef = await addDoc(collection(db, "languages"), enhancedLanguageData);
      console.log("Language added with ID: ", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("Error adding language: ", error);
      throw error;
    }
  }



  // Populate language filter from Firestore with improved error handling
  async function populateLanguageFilter() {
    console.log('populateLanguageFilter called');
    
    const langSelect = document.querySelector('.filter-select');
    console.log('langSelect element:', langSelect);
    
    if (!langSelect) {
      console.error('No .filter-select element found!');
      return;
    }
    
    console.log('Clearing dropdown...');
    langSelect.innerHTML = '<option value="all">All Languages</option>';
    
    // Fetch all language documents from /languages
    try {
      const languagesCol = collection(db, 'languages');
      const querySnapshot = await getDocs(languagesCol);
      console.log('QuerySnapshot received:', querySnapshot);
      console.log('Number of languages found:', querySnapshot.size);
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        console.log('Language doc:', doc.id, data);
        const label = data.nativeName || data.name || doc.id;
        const value = doc.id;
        const languageName = data.name || doc.id; // Use the actual language name
        
        console.log('Adding option:', label, value, '->', languageName);
        
        // Store the mapping from document ID to language name
        languageMap.set(value, languageName);
        
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        langSelect.appendChild(option);
      });
      
      console.log('Final dropdown options:', langSelect.options.length);
    } catch (err) {
      // Fallback languages if Firestore fails
      const fallbackLanguages = [
        { id: 'En', name: 'English' },
        { id: 'Hi', name: 'Hindi' },
        { id: 'gu', name: 'Gujarati' },
        { id: 'ja', name: 'Japanese' },
        { id: 'Es', name: 'Spanish' }
      ];
      fallbackLanguages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang.id;
        option.textContent = lang.name;
        languageMap.set(lang.id, lang.name);
        langSelect.appendChild(option);
      });
      console.log('Added fallback languages');
    }
  }

  // Language filter functionality
  const langSelect = document.querySelector('.filter-select');
  let currentLanguageFilter = 'all'; // Default to 'all'
  let languageMap = new Map(); // Map to store document ID -> language name
  
  if (langSelect) {
    langSelect.addEventListener('change', function() {
      currentLanguageFilter = langSelect.value;
      // Preserve the current search input value
      const preservedSearch = searchInput ? searchInput.value : '';
      currentSearchQuery = preservedSearch.trim();
      allTopics = [];
      currentPage = 0;
      lastVisible = null;
      hasMoreData = true;
      // If a search term is present, re-apply search with new filter
      if (currentSearchQuery) {
        performSearch(currentSearchQuery, langSelect.value);
      } else {
        loadAndRenderTopics(true, langSelect.value);
      }
    });
  }

  // --- Auth UI Logic ---
  const navAuth = document.querySelector('.nav-auth');
  const loginBtn = document.querySelector('.login-btn');
  const signupBtn = document.querySelector('.signup-btn');
  const profileIcon = document.querySelector('.profile-icon');
  const modal = document.getElementById('auth-modal');
  const closeModal = document.querySelector('.close-modal');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const mobileAuthBtn = document.querySelector('.mobile-auth-btn');
  const userInfo = document.querySelector('.user-info');
  const userPhoto = document.querySelector('.user-photo');
  const userName = document.querySelector('.user-name');
  const googleLoginBtns = document.querySelectorAll('.google-login-btn');
  const profilePopup = document.getElementById('profile-popup');
  const profilePopupName = document.querySelector('.profile-popup-name');
  const profilePopupEmail = document.querySelector('.profile-popup-email');
  const profilePopupPhoto = document.querySelector('.profile-popup-photo');
  const profileLogoutBtn = document.querySelector('.profile-logout-btn');
  const profilePopupBack = document.querySelector('.profile-popup-back');

  const auth = getAuth();

  function setAuthUI(user) {
    if (user) {
      if (mobileAuthBtn) mobileAuthBtn.style.display = 'none';
      if (profileIcon) profileIcon.style.display = 'flex';
      if (userInfo) userInfo.style.display = 'flex';
      if (userName) userName.textContent = user.displayName || user.email || '';
      // Profile popup card
      if (profilePopupName) profilePopupName.textContent = user.displayName || user.email || '';
      if (profilePopupPhoto) {
        profilePopupPhoto.src = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || user.email || 'User');
        profilePopupPhoto.alt = user.displayName || 'User';
      }
      // Profile popup should not show automatically on page load
    } else {
      if (mobileAuthBtn) mobileAuthBtn.style.display = '';
      if (profileIcon) profileIcon.style.display = 'none';
      if (userInfo) userInfo.style.display = 'none';
      if (userPhoto) userPhoto.src = '';
      if (userName) userName.textContent = '';
      if (profilePopup) profilePopup.style.display = 'none';
    }
  }

  // Show modal on login/signup click
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      if (modal) modal.style.display = 'flex';
      showTab('login');
    });
  }
  if (signupBtn) {
    signupBtn.addEventListener('click', () => {
      if (modal) modal.style.display = 'flex';
      showTab('signup');
    });
  }
  if (mobileAuthBtn) {
    mobileAuthBtn.addEventListener('click', () => {
      if (modal) modal.style.display = 'flex';
      showTab('login');
    });
  }
  if (closeModal) {
    closeModal.addEventListener('click', () => {
      if (modal) {
        modal.style.display = 'none';
        clearLoginPrompt();
      }
    });
  }
  window.addEventListener('click', (e) => {
    if (e.target === modal && modal) {
      modal.style.display = 'none';
      clearLoginPrompt();
    }
  });

  function clearLoginPrompt() {
    const modalContent = document.querySelector('.modal-content');
    if (modalContent) {
      const existingMessage = modalContent.querySelector('.login-prompt-message');
      if (existingMessage) {
        existingMessage.remove();
      }
    }
  }

  // Tab switching
  function showTab(tab) {
    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    if (loginForm) loginForm.style.display = tab === 'login' ? '' : 'none';
    if (signupForm) signupForm.style.display = tab === 'signup' ? '' : 'none';
  }
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });

  // Firebase login/signup
  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const [emailOrUser, pass] = Array.from(loginForm.querySelectorAll('input')).map(i => i.value);
      let email = emailOrUser;
      if (!email.includes('@')) email += '@example.com'; // fallback for username
      try {
        await signInWithEmailAndPassword(auth, email, pass);
        if (modal) {
          modal.style.display = 'none';
          clearLoginPrompt();
        }
      } catch (err) {
        alert(err.message);
      }
    });
  }
  if (signupForm) {
    signupForm.addEventListener('submit', async e => {
      e.preventDefault();
      const [user, email, pass] = Array.from(signupForm.querySelectorAll('input')).map(i => i.value);
      try {
        await createUserWithEmailAndPassword(auth, email, pass);
        if (modal) {
          modal.style.display = 'none';
          clearLoginPrompt();
        }
      } catch (err) {
        alert(err.message);
      }
    });
  }

  // Google login
  if (googleLoginBtns) {
    googleLoginBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const provider = new GoogleAuthProvider();
        try {
          await signInWithPopup(auth, provider);
          if (modal) {
            modal.style.display = 'none';
            clearLoginPrompt();
          }
        } catch (err) {
          alert(err.message);
        }
      });
    });
  }

  // Profile popup functionality
  if (profileIcon) {
    profileIcon.addEventListener('click', () => {
      if (profilePopup) profilePopup.style.display = 'flex';
    });
  }
  if (profilePopupBack) {
    profilePopupBack.addEventListener('click', () => {
      if (profilePopup) profilePopup.style.display = 'none';
    });
  }
  if (profilePopup) {
    profilePopup.addEventListener('click', (e) => {
      if (e.target === profilePopup) {
        profilePopup.style.display = 'none';
      }
    });
  }

  if (profileLogoutBtn) {
    profileLogoutBtn.addEventListener('click', () => {
      signOut(auth);
      if (profilePopup) profilePopup.style.display = 'none';
    });
  }

  // Auth state observer
  onAuthStateChanged(auth, user => {
    setAuthUI(user);
  });

  // Call populateLanguageFilter after everything is set up
  populateLanguageFilter();

  // Store all topics in memory for filtering
  let allTopics = [];
  let currentPage = 0;
  let itemsPerPage = 10;
  let isLoading = false;
  let hasMoreData = true;
  let lastVisible = null;
  let currentSearchQuery = '';

  // Robust server-side filtering for topics using Firestore compound queries, supporting multiple categories per topic
  async function fetchTopics(limitCount = itemsPerPage, startAfterDoc = null, languageId = null) {
    const topicsCol = collection(db, "Topics");
    let firestoreQuery = query(topicsCol);
    // Build query based on filters
    const filtersActive = (languageId && languageId !== 'all');
    if (languageId && languageId !== 'all') {
      // Only language filter active
      firestoreQuery = query(topicsCol,
        where('language', '==', languageId),
        orderBy('title', 'asc')
      );
    } else {
      firestoreQuery = query(topicsCol, orderBy('title', 'asc'), limit(limitCount));
    }
    if (startAfterDoc && !filtersActive) {
      firestoreQuery = query(firestoreQuery, startAfter(startAfterDoc));
    }
    const topicsSnapshot = await getDocs(firestoreQuery);
    const topics = topicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Update pagination state
    lastVisible = topicsSnapshot.docs[topicsSnapshot.docs.length - 1];
    hasMoreData = !filtersActive && topicsSnapshot.docs.length === limitCount;
    return topics;
  }

  // Search topics with pagination - simplified for existing database
  async function searchTopics(searchQuery, limitCount = itemsPerPage, startAfterDoc = null) {
    return await simpleSearch(searchQuery, limitCount, startAfterDoc);
  }

  // Fallback simple search function - improved with better logging and SEO keywords
  async function simpleSearch(searchQuery, limitCount = itemsPerPage, startAfterDoc = null) {
    const topicsCol = collection(db, "Topics");
    let firestoreQuery = query(topicsCol, orderBy('title'));
    
    if (startAfterDoc) {
      firestoreQuery = query(firestoreQuery, startAfter(startAfterDoc));
    }
    
    const searchLimit = limitCount * 5; // Increased for better coverage
    firestoreQuery = query(firestoreQuery, limit(searchLimit));
    
    const topicsSnapshot = await getDocs(firestoreQuery);
    const allTopics = topicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`Searching for "${searchQuery}" in all topics`);
    console.log(`Total topics fetched: ${allTopics.length}`);
    
    const filteredTopics = allTopics.filter(topic => {
      const searchLower = searchQuery.toLowerCase();
      const searchWords = searchLower.split(/\s+/).filter(word => word.length > 0);
      
      // Standard field matching
      const titleMatch = topic.title && topic.title.toLowerCase().includes(searchLower);
      const descMatch = topic.description && topic.description.toLowerCase().includes(searchLower);
      const langMatch = topic.language && topic.language.toLowerCase().includes(searchLower);
      
      // SEO field matching (using existing seo field)
      let seoMatch = false;
      if (topic.seo && typeof topic.seo === 'string') {
        const seoText = topic.seo.toLowerCase();
        seoMatch = searchWords.some(searchWord => 
          seoText.includes(searchWord)
        );
      }
      
      const matches = titleMatch || descMatch || langMatch || seoMatch;
      
              if (matches) {
          console.log(`✓ Search match: "${topic.title}" (language: "${topic.language}")`);
          console.log(`  Title match: ${titleMatch}, Desc match: ${descMatch}, Lang match: ${langMatch}, SEO match: ${seoMatch}`);
          if (seoMatch && topic.seo) {
            console.log(`  SEO field: "${topic.seo}"`);
          }
        }
      
      return matches;
    });
    
    console.log(`Found ${filteredTopics.length} topics matching search criteria`);
    
    const limitedResults = filteredTopics.slice(0, limitCount);
    lastVisible = topicsSnapshot.docs[topicsSnapshot.docs.length - 1];
    hasMoreData = filteredTopics.length > limitCount;
    
    return limitedResults;
  }

  // Search topics within a specific language - improved with flexible matching
  async function searchTopicsInLanguage(searchQuery, language, limitCount = itemsPerPage, startAfterDoc = null) {
    const topicsCol = collection(db, "Topics");
    let firestoreQuery = query(topicsCol, orderBy('title'));
    
    // Apply pagination
    if (startAfterDoc) {
      firestoreQuery = query(firestoreQuery, startAfter(startAfterDoc));
    }
    
    // Increase limit for search to get more results to filter from
    const searchLimit = limitCount * 5; // Increased to get more results
    firestoreQuery = query(firestoreQuery, limit(searchLimit));
    
    const topicsSnapshot = await getDocs(firestoreQuery);
    const allTopics = topicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`Searching for "${searchQuery}" in language "${language}"`);
    console.log(`Total topics fetched: ${allTopics.length}`);
    
    // Filter by both language and search query with flexible matching
    const filteredTopics = allTopics.filter(topic => {
      const searchLower = searchQuery.toLowerCase();
      const searchWords = searchLower.split(/\s+/).filter(word => word.length > 0);
      const topicLanguage = topic.language ? topic.language.toLowerCase().trim() : '';
      // Clean up search language by removing quotes and extra whitespace
      const searchLanguage = language.toLowerCase().trim().replace(/['"]/g, '');
      
      // Language matching with exact variations
      const languageMappings = {
        'hindi': ['hindi', 'हिंदी', 'hindustani', 'Hindi', 'HINDI'],
        'spanish': ['spanish', 'español', 'espanol', 'Spanish', 'SPANISH'],
        'english': ['english', 'inglés', 'ingles', 'English', 'ENGLISH'],
        'french': ['french', 'français', 'francais', 'French', 'FRENCH'],
        'german': ['german', 'deutsch', 'German', 'GERMAN'],
        'chinese': ['chinese', '中文', 'mandarin', 'Chinese', 'CHINESE'],
        'japanese': ['japanese', '日本語', 'nihongo', 'Japanese', 'JAPANESE'],
        'arabic': ['arabic', 'العربية', 'Arabic', 'ARABIC'],
        'russian': ['russian', 'русский', 'Russian', 'RUSSIAN'],
        'portuguese': ['portuguese', 'português', 'portugues', 'Portuguese', 'PORTUGUESE'],
        'javascript': ['javascript', 'js', 'JavaScript', 'JAVASCRIPT'],
        'python': ['python', 'Python', 'PYTHON'],
        'java': ['java', 'Java', 'JAVA'],
        'cpp': ['cpp', 'c++', 'C++', 'CPP'],
        'csharp': ['csharp', 'c#', 'C#', 'CSHARP']
      };
      
      const validVariations = languageMappings[searchLanguage] || [searchLanguage];
      const languageMatch = validVariations.some(variation => 
        topicLanguage === variation.toLowerCase()
      );
      
      // Search matching with SEO keywords
      const titleMatch = topic.title && topic.title.toLowerCase().includes(searchLower);
      const descMatch = topic.description && topic.description.toLowerCase().includes(searchLower);
      const langMatch = topic.language && topic.language.toLowerCase().includes(searchLower);
      
      // SEO field matching (using existing seo field)
      let seoMatch = false;
      if (topic.seo && typeof topic.seo === 'string') {
        const seoText = topic.seo.toLowerCase();
        seoMatch = searchWords.some(searchWord => 
          seoText.includes(searchWord)
        );
      }
      
      const searchMatch = titleMatch || descMatch || langMatch || seoMatch;
      const matches = languageMatch && searchMatch;
      
              if (matches) {
          console.log(`✓ Match found: "${topic.title}" (language: "${topic.language}")`);
          console.log(`  Title match: ${titleMatch}, Desc match: ${descMatch}, Lang match: ${langMatch}, SEO match: ${seoMatch}`);
          if (seoMatch && topic.seo) {
            console.log(`  SEO field: "${topic.seo}"`);
          }
        }
      
      return matches;
    });
    
    console.log(`Found ${filteredTopics.length} topics matching both language and search criteria`);
    
    // Limit the filtered results to the requested amount
    const limitedResults = filteredTopics.slice(0, limitCount);
    
    // Update pagination state based on whether we have more filtered results
    lastVisible = topicsSnapshot.docs[topicsSnapshot.docs.length - 1];
    hasMoreData = filteredTopics.length > limitCount;
    
    return limitedResults;
  }

  // Load topics by specific language - simplified for existing database
  async function loadTopicsByLanguage(language, limitCount = itemsPerPage, startAfterDoc = null, append = false) {
    if (isLoading && !append) return;
    
    if (!append) {
      isLoading = true;
      removeLoadingIndicator();
    }
    
    try {
      const topicsCol = collection(db, "Topics");
      
      // Use simple query and filter client-side for now
      let firestoreQuery = query(topicsCol, orderBy('title', 'asc'));
      
      // Apply pagination
      if (startAfterDoc) {
        firestoreQuery = query(firestoreQuery, startAfter(startAfterDoc));
      }
      
      // Get more documents to filter from
      const searchLimit = limitCount * 3;
      firestoreQuery = query(firestoreQuery, limit(searchLimit));
      
      const topicsSnapshot = await getDocs(firestoreQuery);
      const fetchedTopics = topicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Debug: Log all topics and their languages
      console.log('All fetched topics:');
      fetchedTopics.forEach(topic => {
        console.log(`- ${topic.title}: language = "${topic.language}"`);
      });
      console.log(`Looking for language: "${language}"`);
      
      // Filter by language client-side - only show exact language matches
      const filteredTopics = fetchedTopics.filter(topic => {
        const topicLanguage = topic.language ? topic.language.toLowerCase().trim() : '';
        // Clean up search language by removing quotes and extra whitespace
        const searchLanguage = language.toLowerCase().trim().replace(/['"]/g, '');
        
        // Define language mappings for exact matching
        const languageMappings = {
          'hindi': ['hindi', 'हिंदी', 'hindustani', 'Hindi', 'HINDI'],
          'spanish': ['spanish', 'español', 'espanol', 'Spanish', 'SPANISH'],
          'english': ['english', 'inglés', 'ingles', 'English', 'ENGLISH'],
          'french': ['french', 'français', 'francais', 'French', 'FRENCH'],
          'german': ['german', 'deutsch', 'German', 'GERMAN'],
          'chinese': ['chinese', '中文', 'mandarin', 'Chinese', 'CHINESE'],
          'japanese': ['japanese', '日本語', 'nihongo', 'Japanese', 'JAPANESE'],
          'arabic': ['arabic', 'العربية', 'Arabic', 'ARABIC'],
          'russian': ['russian', 'русский', 'Russian', 'RUSSIAN'],
          'portuguese': ['portuguese', 'português', 'portugues', 'Portuguese', 'PORTUGUESE'],
          'javascript': ['javascript', 'js', 'JavaScript', 'JAVASCRIPT'],
          'python': ['python', 'Python', 'PYTHON'],
          'java': ['java', 'Java', 'JAVA'],
          'cpp': ['cpp', 'c++', 'C++', 'CPP'],
          'csharp': ['csharp', 'c#', 'C#', 'CSHARP']
        };
        
        // Get the valid variations for the search language
        const validVariations = languageMappings[searchLanguage] || [searchLanguage];
        
        // Check if topic language exactly matches any of the valid variations
        const exactMatch = validVariations.some(variation => 
          topicLanguage === variation.toLowerCase()
        );
        
        console.log(`Topic: "${topic.title}"`);
        console.log(`  Topic Language: "${topicLanguage}"`);
        console.log(`  Search Language: "${searchLanguage}"`);
        console.log(`  Valid Variations: [${validVariations.join(', ')}]`);
        console.log(`  Exact Match: ${exactMatch}`);
        
        return exactMatch;
      });
      
      console.log(`Found ${filteredTopics.length} topics for language "${language}"`);
      
      // Limit the filtered results
      const limitedResults = filteredTopics.slice(0, limitCount);
      
      // Update pagination state
      lastVisible = topicsSnapshot.docs[topicsSnapshot.docs.length - 1];
      hasMoreData = filteredTopics.length > limitCount;
      
      if (!append) {
        // Update topics array and render for initial load
        allTopics = limitedResults;
        renderTopics(limitedResults, false);
        
        // Update section title
        const topicSection = document.getElementById('all-topics-section');
        if (topicSection) {
          const h2 = topicSection.querySelector('h2');
          if (h2) {
            h2.textContent = `${language} Topics (${limitedResults.length} found)`;
          }
        }
      }
      
      return limitedResults;
      
    } catch (error) {
      console.error('Error loading topics by language:', error);
      return [];
    } finally {
      if (!append) {
        isLoading = false;
      }
    }
  }

  // --- Add Save Option to Topic Card ---
  function createTopicCard(topic) {
    const card = document.createElement('div');
    card.className = 'card topic-card';

    // Thumbnail at the top
    const img = document.createElement('img');
    const placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgZmlsbD0iI2Y1ZjVmNSIvPgogIDx0ZXh0IHg9IjE2MCIgeT0iOTAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=';
    img.src = topic.thumbnail && topic.thumbnail.trim() ? topic.thumbnail : placeholder;
    img.alt = topic.title || 'Topic Image';
    img.className = 'topic-thumbnail';
    img.onerror = function() { this.src = placeholder; };
    card.appendChild(img);

    // Title (centered, bold)
    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = topic.title;
    card.appendChild(title);

    // Language tag (pill style)
    const lang = document.createElement('div');
    lang.className = 'topic-language';
    lang.textContent = topic.language;
    card.appendChild(lang);

    // Description (centered) with expand functionality
    const desc = document.createElement('div');
    desc.className = 'topic-description';
    desc.textContent = topic.description;
    const isLongDescription = topic.description && topic.description.length > 100;
    if (isLongDescription) {
      desc.classList.add('expandable');
      const expandArrow = document.createElement('div');
      expandArrow.className = 'expand-arrow';
      expandArrow.innerHTML = '▼';
      expandArrow.title = 'Click to expand description';
      expandArrow.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = desc.classList.contains('expanded');
        if (isExpanded) {
          desc.classList.remove('expanded');
          expandArrow.classList.remove('expanded');
          expandArrow.innerHTML = '▼';
          expandArrow.title = 'Click to expand description';
        } else {
          desc.classList.add('expanded');
          expandArrow.classList.add('expanded');
          expandArrow.innerHTML = '▲';
          expandArrow.title = 'Click to collapse description';
        }
      });
      card.appendChild(desc);
      card.appendChild(expandArrow);
    } else {
      card.appendChild(desc);
    }

    // LEARN button (full width, blue, at bottom)
    const btn = document.createElement('button');
    btn.className = 'learn-btn';
    btn.textContent = 'LEARN';
    btn.onclick = () => {
      handleLearnButtonClick(topic);
    };
    card.appendChild(btn);

    return card;
  }

  function handleLearnButtonClick(topic) {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      // User is not logged in - show login modal
      showLoginPrompt();
      return;
    }
    
    // User is logged in - proceed to learning content
    if (topic.blogUrl) {
      window.open(topic.blogUrl, '_blank');
    } else {
      alert('Learning content is not available for this topic yet.');
    }
  }

  function showLoginPrompt() {
    // Show the auth modal
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.style.display = 'flex';
      showTab('login');
      
      // Add a message to inform user why they need to login
      const modalContent = modal.querySelector('.modal-content');
      if (modalContent) {
        // Remove any existing login prompt message
        const existingMessage = modalContent.querySelector('.login-prompt-message');
        if (existingMessage) {
          existingMessage.remove();
        }
        
        // Add new message
        const message = document.createElement('div');
        message.className = 'login-prompt-message';
        message.innerHTML = `
          <div style="background: #e3f2fd; border: 1px solid #2196f3; border-radius: 8px; padding: 12px; margin-bottom: 16px; text-align: center; color: #1976d2;">
            <strong>🔒 Login Required</strong><br>
            Please log in to access learning content
          </div>
        `;
        modalContent.insertBefore(message, modalContent.firstChild);
      }
    }
  }

  function renderTopics(topics, append = false) {
    const main = document.querySelector('main');
    let topicSection = document.getElementById('all-topics-section');
    if (!topicSection) {
      topicSection = document.createElement('section');
      topicSection.id = 'all-topics-section';
      main.appendChild(topicSection);
    }
    if (!append) {
      topicSection.innerHTML = '';
      const h2 = document.createElement('h2');
      // Build heading based on filters
      const languageId = langSelect ? langSelect.value : null;
      let heading = '';
      let langName = (languageId && languageId !== 'all') ? (languageMap.get(languageId) || languageId) : '';
      if (langName) {
        heading = `${langName} Topics (${topics.length} found)`;
      } else {
        heading = `All Topics (${topics.length} found)`;
      }
      h2.textContent = heading;
      topicSection.appendChild(h2);
    }
    
    let row = document.getElementById('all-topics-row');
    if (!row) {
      row = document.createElement('div');
      row.className = 'card-row';
      row.id = 'all-topics-row';
      topicSection.appendChild(row);
    }
    
    if (!topics || topics.length === 0) {
      if (!append) {
        row.textContent = 'No topics found.';
      }
    } else {
      topics.forEach(topic => {
        row.appendChild(createTopicCard(topic));
      });
    }
    
    // Add loading indicator if there's more data
    if (hasMoreData && !isLoading) {
      addLoadingIndicator();
    }
  }

  function addLoadingIndicator() {
    const row = document.getElementById('all-topics-row');
    if (!row) return;
    
    // Remove existing loading indicator
    const existingLoader = row.querySelector('.loading-indicator');
    if (existingLoader) {
      existingLoader.remove();
    }
    
    const loader = document.createElement('div');
    loader.className = 'loading-indicator';
    loader.innerHTML = `
      <div class="loading-spinner"></div>
      <p>Loading more topics...</p>
    `;
    row.appendChild(loader);
  }

  function removeLoadingIndicator() {
    const loader = document.querySelector('.loading-indicator');
    if (loader) {
      loader.remove();
    }
  }

  // Update loadAndRenderTopics to pass filters to fetchTopics
  async function loadAndRenderTopics(reset = true, languageId = 'all') {
    if (reset) {
      allTopics = [];
      currentPage = 0;
      lastVisible = null;
      hasMoreData = true;
    }
    if (isLoading || !hasMoreData) return;
    isLoading = true;
    removeLoadingIndicator();
    try {
      let newTopics = await fetchTopics(itemsPerPage, lastVisible);
      // Filter by languageId if not 'all'
      if (languageId && languageId !== 'all') {
        newTopics = newTopics.filter(t => t.language === languageId);
      }
      allTopics = reset ? newTopics : [...allTopics, ...newTopics];
      renderTopics(newTopics, !reset);
      // Show helpful message if no results
      const topicSection = document.getElementById('all-topics-section');
      if (topicSection) {
        let row = document.getElementById('all-topics-row');
        if ((!newTopics || newTopics.length === 0) && row) {
          row.innerHTML = '<div style="width:100%;text-align:center;color:#888;padding:32px 0;">No topics found.<br>Try a different filter or check your spelling.</div>';
        }
      }
    } catch (error) {
      console.error('Error loading topics:', error);
      const row = document.getElementById('all-topics-row');
      if (row) {
        row.innerHTML = '<div style="color:red;">Failed to load topics. Please try again later.</div>';
      }
    } finally {
      isLoading = false;
    }
  }

  async function loadMoreTopics() {
    if (isLoading || !hasMoreData) return;
    
    isLoading = true;
    removeLoadingIndicator();
    
    try {
      const newTopics = await fetchTopics(itemsPerPage, lastVisible);
      allTopics = [...allTopics, ...newTopics];
      renderTopics(newTopics, true);
    } catch (error) {
      console.error('Error loading more topics:', error);
    } finally {
      isLoading = false;
    }
  }

  // Search functionality with debouncing
  const searchInput = document.querySelector('.search-bar');
  let searchTimeout;
  
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const query = this.value.trim();
      currentSearchQuery = query;
      
      // Clear previous timeout
      clearTimeout(searchTimeout);
      
      // Debounce search to avoid too many requests
      searchTimeout = setTimeout(async () => {
        // Always apply current language filter
        const languageId = langSelect ? langSelect.value : null;
        if (!query) {
          // Reset to show topics based on current language filter
          if (languageId && languageId !== 'all') {
            await loadAndRenderTopics(true, languageId);
          } else {
            await loadAndRenderTopics(true);
          }
          return;
        }
        
        // Reset pagination for new search
        allTopics = [];
        currentPage = 0;
        lastVisible = null;
        hasMoreData = true;
        
        // Perform search with current language filter
        await performSearch(query, languageId);
      }, 300); // 300ms delay
    });
  }

  // Update performSearch to accept languageId and always filter by it
  async function performSearch(query, languageId = 'all') {
    if (isLoading) return;
    isLoading = true;
    removeLoadingIndicator();
    try {
      // Always search all topics, then filter by language if needed
      let searchResults = await searchTopics(query, itemsPerPage, null);
      // Multi-word, case-insensitive search in title, description, tags, and seo
      const searchWords = query.toLowerCase().split(/\s+/).filter(Boolean);
      searchResults = searchResults.filter(t => {
        // Gather all searchable fields
        const title = (t.title || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const tags = Array.isArray(t.tags) ? t.tags.map(tag => tag.toLowerCase()) : [];
        const seo = (t.seo || '').toLowerCase();
        // All words must be present in any field, including SEO
        return searchWords.every(word =>
          title.includes(word) ||
          desc.includes(word) ||
          tags.some(tag => tag.includes(word)) ||
          seo.includes(word)
        );
      });
      // Flexible language filter
      if (languageId && languageId !== 'all') {
        searchResults = searchResults.filter(t => t.language === languageId);
      }
      // Debug logs
      console.log('Search query:', query);
      console.log('Language filter:', languageId);
      console.log('Filtered search results:', searchResults);
      console.log('Number of search results after filtering:', searchResults.length);
      allTopics = searchResults;
      renderTopics(searchResults, false);
      // Show search results count and helpful message if none
      const topicSection = document.getElementById('all-topics-section');
      if (topicSection) {
        const h2 = topicSection.querySelector('h2');
        if (h2) {
          let langName = (languageId && languageId !== 'all') ? (languageMap.get(languageId) || languageId) : '';
          let filterText = langName ? ` in ${langName}` : '';
          h2.textContent = `Search Results for "${query}"${filterText} (${searchResults.length} found)`;
        }
        // Show helpful message if no results
        if (searchResults.length === 0) {
          let row = document.getElementById('all-topics-row');
          if (!row) {
            row = document.createElement('div');
            row.className = 'card-row';
            row.id = 'all-topics-row';
            topicSection.appendChild(row);
          }
          row.innerHTML = '<div style="width:100%;text-align:center;color:#888;padding:32px 0;">No topics found.<br>Try a different search term or filter, or check your spelling.</div>';
        }
      }
    } catch (error) {
      console.error('Error searching topics:', error);
      const row = document.getElementById('all-topics-row');
      if (row) {
        row.innerHTML = '<div style="color:red;">Failed to search topics. Please try again later.</div>';
      }
    } finally {
      isLoading = false;
    }
  }

  // Database Setup and Index Management
  async function setupDatabaseIndexes() {
    console.log('Setting up database indexes...');
    
    // For your current database structure, you only need this one index
    const requiredIndexes = [
      {
        collection: 'Topics',
        fields: ['title'],
        description: 'For basic topic ordering and pagination'
      }
    ];
    
    console.log('Required Firestore indexes for current setup:');
    requiredIndexes.forEach((index, i) => {
      console.log(`${i + 1}. Collection: ${index.collection}`);
      console.log(`   Fields: ${index.fields.join(', ')}`);
      console.log(`   Purpose: ${index.description}`);
      console.log('');
    });
    
    console.log('To create this index:');
    console.log('1. Go to Firebase Console > Firestore Database > Indexes');
    console.log('2. Click "Add Index"');
    console.log('3. Collection ID: Topics');
    console.log('4. Fields: title (Ascending)');
    console.log('5. Click "Create Index"');
    console.log('6. Wait for index to build (may take a few minutes)');
    
    console.log('\nFor future optimization, you can add these indexes:');
    console.log('- Collection: Topics, Fields: [language, title] - For language filtering');
    console.log('- Collection: Topics, Fields: [title, createdAt] - For better search');
    console.log('- Collection: languages, Fields: [name] - For language dropdown');
  }

  // Sample data insertion functions for testing
  async function insertSampleData() {
    console.log('Inserting sample data...');
    
    const sampleTopics = [
      {
        title: 'JavaScript Fundamentals',
        description: 'Learn the basics of JavaScript programming',
        language: 'JavaScript',
        thumbnail: 'https://example.com/js-thumb.jpg',
        blogUrl: 'https://example.com/js-fundamentals',
        tags: ['beginner', 'fundamentals', 'javascript']
      },
      {
        title: 'React Hooks Tutorial',
        description: 'Master React Hooks for modern component development',
        language: 'JavaScript',
        thumbnail: 'https://example.com/react-thumb.jpg',
        blogUrl: 'https://example.com/react-hooks',
        tags: ['react', 'hooks', 'frontend']
      },
      {
        title: 'Python Data Science',
        description: 'Introduction to data science with Python',
        language: 'Python',
        thumbnail: 'https://example.com/python-thumb.jpg',
        blogUrl: 'https://example.com/python-data-science',
        tags: ['python', 'data-science', 'analytics']
      }
    ];
    
    const sampleLanguages = [
      { name: 'JavaScript', nativeName: 'JavaScript' },
      { name: 'Python', nativeName: 'Python' },
      { name: 'Java', nativeName: 'Java' },
      { name: 'C++', nativeName: 'C++' },
      { name: 'C#', nativeName: 'C#' }
    ];
    
    try {
      // Insert sample topics
      for (const topic of sampleTopics) {
        await addTopicToDatabase(topic);
      }
      
      // Insert sample languages
    
      for (const lang of sampleLanguages) {
        await addLanguageToDatabase(lang);
      }
      
      console.log('Sample data inserted successfully!');
    } catch (error) {
      console.error('Error inserting sample data:', error);
    }
  }

  // Debug function to check language mapping
  function debugLanguageMapping() {
    console.log('=== Language Mapping Debug ===');
    console.log('Language Map:', languageMap);
    console.log('Current Language Filter:', currentLanguageFilter);
    console.log('Available languages in dropdown:');
    
    const langSelect = document.querySelector('.filter-select');
    if (langSelect) {
      Array.from(langSelect.options).forEach(option => {
        const languageName = languageMap.get(option.value);
        console.log(`- Option: "${option.textContent}" (value: "${option.value}") -> Language: "${languageName}"`);
      });
    }
    console.log('=== End Debug ===');
  }

  // Comprehensive test function for filter search
  async function testFilterSearch() {
    console.log('=== Filter Search Test ===');
    
    // Test 1: Check current state
    console.log('1. Current State:');
    console.log(`   - Current Language Filter: "${currentLanguageFilter}"`);
    console.log(`   - Current Search Query: "${currentSearchQuery}"`);
    console.log(`   - Total Topics in Memory: ${allTopics.length}`);
    
    // Test 2: Test language filter dropdown
    console.log('\n2. Language Filter Dropdown:');
    const langSelect = document.querySelector('.filter-select');
    if (langSelect) {
      console.log(`   - Selected Value: "${langSelect.value}"`);
      console.log(`   - Selected Text: "${langSelect.options[langSelect.selectedIndex]?.textContent}"`);
      console.log(`   - Mapped Language: "${languageMap.get(langSelect.value)}"`);
    }
    
    // Test 3: Test search input
    console.log('\n3. Search Input:');
    const searchInput = document.querySelector('.search-bar');
    if (searchInput) {
      console.log(`   - Current Value: "${searchInput.value}"`);
      console.log(`   - Placeholder: "${searchInput.placeholder}"`);
    }
    
    // Test 4: Test with sample data
    console.log('\n4. Testing with sample search:');
    try {
      // Test search without language filter
      console.log('   Testing search for "javascript"...');
      const searchResults = await simpleSearch('javascript', 5, null);
      console.log(`   Found ${searchResults.length} results for "javascript"`);
      
      // Test search with language filter (if one is active)
      if (currentLanguageFilter && currentLanguageFilter !== 'all') {
        console.log(`   Testing search for "javascript" in "${currentLanguageFilter}"...`);
        const filteredResults = await searchTopicsInLanguage('javascript', currentLanguageFilter, 5, null);
        console.log(`   Found ${filteredResults.length} results for "javascript" in "${currentLanguageFilter}"`);
      }
    } catch (error) {
      console.error('   Error during test search:', error);
    }
    
    console.log('=== End Filter Search Test ===');
  }

  // Function to analyze topic language data
  async function analyzeTopicLanguages() {
    console.log('=== Analyzing Topic Languages ===');
    
    try {
      const topicsCol = collection(db, "Topics");
      const querySnapshot = await getDocs(topicsCol);
      
      const languageStats = {};
      const topicsWithIssues = [];
      
      querySnapshot.docs.forEach(doc => {
        const topic = { id: doc.id, ...doc.data() };
        const language = topic.language || '';
        
        if (!languageStats[language]) {
          languageStats[language] = [];
        }
        languageStats[language].push(topic.title);
        
        if (!language || language.trim() === '') {
          topicsWithIssues.push({
            id: doc.id,
            title: topic.title,
            language: language,
            issue: 'Empty or missing language field'
          });
        }
      });
      
      console.log('Language Statistics:');
      Object.keys(languageStats).forEach(lang => {
        console.log(`"${lang}": ${languageStats[lang].length} topics`);
        console.log(`  Topics: ${languageStats[lang].join(', ')}`);
      });
      
      if (topicsWithIssues.length > 0) {
        console.log('\nTopics with Language Issues:');
        topicsWithIssues.forEach(topic => {
          console.log(`- ${topic.title} (ID: ${topic.id}): "${topic.language}" - ${topic.issue}`);
        });
      }
      
      console.log('\nAvailable Languages in Database:');
      const availableLanguages = Object.keys(languageStats).filter(lang => lang.trim() !== '');
      console.log(availableLanguages);
      
      // Show what the filter will match for each language
      console.log('\nLanguage Filter Matching:');
      const languageMappings = {
        'hindi': ['hindi', 'हिंदी', 'hindustani', 'Hindi', 'HINDI'],
        'spanish': ['spanish', 'español', 'espanol', 'Spanish', 'SPANISH'],
        'english': ['english', 'inglés', 'ingles', 'English', 'ENGLISH'],
        'french': ['french', 'français', 'francais', 'French', 'FRENCH'],
        'german': ['german', 'deutsch', 'German', 'GERMAN'],
        'chinese': ['chinese', '中文', 'mandarin', 'Chinese', 'CHINESE'],
        'japanese': ['japanese', '日本語', 'nihongo', 'Japanese', 'JAPANESE'],
        'arabic': ['arabic', 'العربية', 'Arabic', 'ARABIC'],
        'russian': ['russian', 'русский', 'Russian', 'RUSSIAN'],
        'portuguese': ['portuguese', 'português', 'portugues', 'Portuguese', 'PORTUGUESE'],
        'javascript': ['javascript', 'js', 'JavaScript', 'JAVASCRIPT'],
        'python': ['python', 'Python', 'PYTHON'],
        'java': ['java', 'Java', 'JAVA'],
        'cpp': ['cpp', 'c++', 'C++', 'CPP'],
        'csharp': ['csharp', 'c#', 'C#', 'CSHARP']
      };
      
      availableLanguages.forEach(lang => {
        const matchingFilters = [];
        Object.keys(languageMappings).forEach(filterKey => {
          if (languageMappings[filterKey].some(variation => 
            lang.toLowerCase() === variation.toLowerCase()
          )) {
            matchingFilters.push(filterKey);
          }
        });
        
        if (matchingFilters.length > 0) {
          console.log(`"${lang}" will match filter: [${matchingFilters.join(', ')}]`);
        } else {
          console.log(`"${lang}" will NOT match any filter`);
        }
      });
      
    } catch (error) {
      console.error('Error analyzing topics:', error);
    }
    
    console.log('=== End Analysis ===');
  }

  // Function to analyze SEO field for existing topics
  async function analyzeTopicSEO(topicId) {
    console.log(`=== Analyzing SEO for Topic ID: ${topicId} ===`);
    
    try {
      const topicRef = doc(db, "Topics", topicId);
      const topicDoc = await getDoc(topicRef);
      
      if (!topicDoc.exists()) {
        console.log('Topic not found');
        return;
      }
      
      const topic = { id: topicDoc.id, ...topicDoc.data() };
      
      console.log('Topic Data:');
      console.log(`- Title: "${topic.title}"`);
      console.log(`- Description: "${topic.description}"`);
      console.log(`- Language: "${topic.language}"`);
      console.log(`- Tags: [${(topic.tags || []).join(', ')}]`);
      
      console.log('\nSEO Field:');
      if (topic.seo && typeof topic.seo === 'string') {
        console.log(`"${topic.seo}"`);
        console.log(`SEO field length: ${topic.seo.length} characters`);
      } else {
        console.log('No SEO field found or SEO field is not a string');
      }
      
      // Test search functionality
      console.log('\nSearch Test:');
      const testSearches = ['javascript', 'web', 'api', 'learning'];
      testSearches.forEach(searchTerm => {
        if (topic.seo && topic.seo.toLowerCase().includes(searchTerm.toLowerCase())) {
          console.log(`✓ "${searchTerm}" found in SEO field`);
        } else {
          console.log(`✗ "${searchTerm}" NOT found in SEO field`);
        }
      });
      
    } catch (error) {
      console.error('Error analyzing topic SEO:', error);
    }
    
    console.log('=== End SEO Analysis ===');
  }

  // Function to list all topics with their SEO fields
  async function listTopicsWithSEO() {
    console.log('=== Listing All Topics with SEO Fields ===');
    
    try {
      const topicsCol = collection(db, "Topics");
      const querySnapshot = await getDocs(topicsCol);
      
      let topicsWithSEO = 0;
      let topicsWithoutSEO = 0;
      
      querySnapshot.docs.forEach(doc => {
        const topic = { id: doc.id, ...doc.data() };
        
        if (topic.seo && typeof topic.seo === 'string' && topic.seo.trim() !== '') {
          console.log(`✓ "${topic.title}" - SEO: "${topic.seo.substring(0, 100)}${topic.seo.length > 100 ? '...' : ''}"`);
          topicsWithSEO++;
        } else {
          console.log(`✗ "${topic.title}" - No SEO field`);
          topicsWithoutSEO++;
        }
      });
      
      console.log(`\nSEO Field Summary:`);
      console.log(`- Topics with SEO: ${topicsWithSEO}`);
      console.log(`- Topics without SEO: ${topicsWithoutSEO}`);
      console.log(`- Total topics: ${topicsWithSEO + topicsWithoutSEO}`);
      
    } catch (error) {
      console.error('Error listing topics with SEO:', error);
    }
    
    console.log('=== End SEO Listing ===');
  }

  // Utility: Batch update all topics to include a 'seo' field for better search
  async function batchUpdateSEOFields() {
    const topicsCol = collection(db, "Topics");
    const snapshot = await getDocs(topicsCol);
    for (const d of snapshot.docs) {
      const data = d.data();
      // Combine title, description, and tags for SEO
      const seo = [
        data.title || "",
        data.description || "",
        (data.tags || []).join(" ")
      ].join(" ").toLowerCase();
      await updateDoc(doc(db, "Topics", d.id), { seo });
      console.log(`Updated topic ${d.id} with SEO:`, seo);
    }
  }
  // To run: call batchUpdateSEOFields() from the browser console after the app loads.

  // --- Firestore Save/Unsave Logic ---
  async function toggleSaveTopic(userId, topic) {
    const userDoc = doc(db, 'user info', userId);
    const userSnap = await getDoc(userDoc);
    let saved = [];
    if (userSnap.exists() && Array.isArray(userSnap.data().savedTopics)) {
      saved = userSnap.data().savedTopics;
    }
    const idx = saved.findIndex(t => t === topic.id);
    if (idx === -1) {
      saved.push(topic.id);
    } else {
      saved.splice(idx, 1);
    }
    await setDoc(userDoc, { savedTopics: saved }, { merge: true });
  }
  async function isTopicSaved(userId, topicId) {
    const userDoc = doc(db, 'user info', userId);
    const userSnap = await getDoc(userDoc);
    if (userSnap.exists() && Array.isArray(userSnap.data().savedTopics)) {
      return userSnap.data().savedTopics.includes(topicId);
    }
    return false;
  }

  // Initialize with first batch of topics
  loadAndRenderTopics(true);
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const scrollPosition = window.scrollY + window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // Load more when user is near bottom (within 200px)
      if (scrollPosition >= documentHeight - 200 && hasMoreData && !isLoading) {
        if (currentSearchQuery) {
          // Load more search results
          loadMoreSearchResults();
        } else if (currentLanguageFilter && currentLanguageFilter !== 'all') {
          // Load more language-filtered topics
          loadMoreLanguageTopics();
        } else {
          // Load more regular topics
          loadMoreTopics();
        }
      }
    }, 100);
  });

  async function loadMoreSearchResults() {
    if (isLoading || !hasMoreData) return;
    
    isLoading = true;
    removeLoadingIndicator();
    
    try {
      let newResults;
      
      // If there's a language filter active, search within that language
      if (currentLanguageFilter && currentLanguageFilter !== 'all') {
        newResults = await searchTopicsInLanguage(currentSearchQuery, currentLanguageFilter, itemsPerPage, lastVisible);
      } else {
        newResults = await searchTopics(currentSearchQuery, itemsPerPage, lastVisible);
      }
      
      allTopics = [...allTopics, ...newResults];
      renderTopics(newResults, true);
      
      // Update search results count
      const topicSection = document.getElementById('all-topics-section');
      if (topicSection) {
        const h2 = topicSection.querySelector('h2');
        if (h2 && h2.textContent.includes('Search Results')) {
          const currentCount = allTopics.length;
          const queryMatch = h2.textContent.match(/for "([^"]+)"/);
          if (queryMatch) {
            const languageText = currentLanguageFilter && currentLanguageFilter !== 'all' ? ` in ${currentLanguageFilter}` : '';
            h2.textContent = `Search Results for "${queryMatch[1]}"${languageText} (${currentCount} found)`;
          }
        }
      }
    } catch (error) {
      console.error('Error loading more search results:', error);
    } finally {
      isLoading = false;
    }
  }

  async function loadMoreLanguageTopics() {
    if (isLoading || !hasMoreData) return;
    
    isLoading = true;
    removeLoadingIndicator();
    
    try {
      const newResults = await loadTopicsByLanguage(currentLanguageFilter, itemsPerPage, lastVisible, true);
      allTopics = [...allTopics, ...newResults];
      renderTopics(newResults, true);
      
      // Update language filter results count
      const topicSection = document.getElementById('all-topics-section');
      if (topicSection) {
        const h2 = topicSection.querySelector('h2');
        if (h2 && h2.textContent.includes('Topics')) {
          const currentCount = allTopics.length;
          h2.textContent = `${currentLanguageFilter} Topics (${currentCount} found)`;
        }
      }
    } catch (error) {
      console.error('Error loading more language topics:', error);
    } finally {
      isLoading = false;
    }
  }

  // --- Profile Popup: Show Saved Topics ---
  if (profileIcon) {
    profileIcon.addEventListener('click', async () => {
      if (profilePopup) {
        profilePopup.style.display = 'flex';
        // Show saved topics
        const user = auth.currentUser;
        if (user) {
          const userDoc = doc(db, 'user info', user.uid);
          const userSnap = await getDoc(userDoc);
          let saved = [];
          if (userSnap.exists() && Array.isArray(userSnap.data().savedTopics)) {
            saved = userSnap.data().savedTopics;
          }
          // Fetch topic details
          let savedTopics = [];
          if (saved.length > 0) {
            const topicsCol = collection(db, 'Topics');
            const allDocs = await getDocs(topicsCol);
            savedTopics = allDocs.docs.filter(d => saved.includes(d.id)).map(d => ({ id: d.id, ...d.data() }));
          }
          // Render in popup
          let savedSection = profilePopup.querySelector('.profile-saved-topics');
          if (!savedSection) {
            savedSection = document.createElement('div');
            savedSection.className = 'profile-saved-topics';
            profilePopup.appendChild(savedSection);
          }
          savedSection.innerHTML = '<h3>Saved Topics</h3>';
          if (savedTopics.length === 0) {
            savedSection.innerHTML += '<div style="color:#888;">No saved topics.</div>';
          } else {
            savedTopics.forEach(topic => {
              const card = createTopicCard(topic);
              savedSection.appendChild(card);
            });
          }
        }
      }
    });
  }
}); 