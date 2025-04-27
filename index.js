import { fetchJSON, renderProjects, fetchGitHubData } from './global.js';

// 1. Fetch all projects
const projects = await fetchJSON('./lib/projects.json');

// 2. Take first 3 projects and fix their image paths
const latestProjects = projects.slice(0, 3).map(project => ({
  ...project,
  image: project.image.replace('../', './')  // Correct the path for homepage
}));

// 3. Select the container and render the projects
const projectsContainer = document.querySelector('.projects');
renderProjects(latestProjects, projectsContainer, 'h2');

// 4. Fetch GitHub profile data
const githubData = await fetchGitHubData('d4zhu');

// 5. Select the GitHub profile stats container and render
const profileStats = document.querySelector('#profile-stats');

if (profileStats) {
  profileStats.innerHTML = `
    <dl>
      <dt>PUBLIC REPOS:</dt><dd>${githubData.public_repos}</dd>
      <dt>PUBLIC GISTS:</dt><dd>${githubData.public_gists}</dd>
      <dt>FOLLOWERS:</dt><dd>${githubData.followers}</dd>
      <dt>FOLLOWING:</dt><dd>${githubData.following}</dd>
    </dl>
  `;
}
