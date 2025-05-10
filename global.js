//LAB 3
console.log('IT’S ALIVE!');

let pages = [
  { url: '/portfolio/', title: 'Home' },
  { url: '/portfolio/projects/', title: 'Projects' },
  { url: '/portfolio/contact/', title: 'Contact' },
  { url: '/portfolio/resume/', title: 'Resume' },
  { url: '/portfolio/meta/', title: 'Meta' },
  { url: 'https://github.com/d4zhu', title: 'Github' },
];

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;
  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;

  let isHomePage =
    (location.pathname === "/portfolio/" && a.pathname === "/portfolio/index.html") ||
    (location.pathname === "/portfolio/index.html" && a.pathname === "/portfolio/");

  if (
    (a.host === location.host && a.pathname === location.pathname) ||
    isHomePage
  ) {
    a.classList.add("current");
  }
  if (a.host !== location.host) {
    a.setAttribute('target', '_blank');
  }

  nav.append(a);
}

document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select id="color-scheme-select">
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

const select = document.querySelector('#color-scheme-select');

function setColorScheme(scheme) {
  document.documentElement.style.setProperty('color-scheme', scheme);
  select.value = scheme;
}

if ("colorScheme" in localStorage) {
  setColorScheme(localStorage.colorScheme);
}

select.addEventListener('input', function (event) {
  const value = event.target.value;
  console.log("Saving to localStorage:", value);
  localStorage.colorScheme = value;
  setColorScheme(value);
  console.log('color scheme changed to', value);
});



//LAB 4
export async function fetchJSON(url) {
  try {
    // Fetch the JSON file from the given URL
    const response = await fetch(url);
    console.log(response)
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  // 1. Defensive checks
  if (!Array.isArray(projects)) {
    console.error('renderProjects expects an array of projects.');
    return;
  }
  if (!containerElement) {
    console.error('renderProjects needs a valid container element.');
    return;
  }

  // 2. Clear the container first
  containerElement.innerHTML = '';

  // 3. Create a valid heading level (basic validation fallback)
  const validHeadingLevels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  if (!validHeadingLevels.includes(headingLevel)) {
    headingLevel = 'h2';
  }

  // 4. Loop through each project
  for (const project of projects) {
    const article = document.createElement('article');
    const year = project.year || '';

    // Optional: graceful fallback for missing project fields
    const title = project.title || 'Untitled Project';
    const image = project.image || '';
    const description = project.description || '';

    article.innerHTML = `
    <${headingLevel}>${title}</${headingLevel}>
    ${image ? `<img src="${image}" alt="${title}">` : ''}
    <div class="project-text">
      <p>${description}</p>
      <p class="year">${year}</p>
    </div>
  `;

    containerElement.appendChild(article);
  }
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}

