import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');

const titleElement = document.querySelector('.projects-title');
if (titleElement) {
  titleElement.textContent = `${projects.length} Projects`;
}

let selectedIndex = -1; 
let query = '';   

renderProjects(projects, projectsContainer, 'h2');
renderPieChart(projects); 

function renderPieChart(data) {
  let svg = d3.select('#projects-plot');
  let legend = d3.select('.legend');

  svg.selectAll('*').remove();
  legend.selectAll('*').remove();

  let rolledData = d3.rollups(projects, v => v.length, d => d.year);
  let pieData = rolledData.map(([year, count]) => ({
    value: count,
    label: year
  }));

  let colors = d3.scaleOrdinal(d3.schemeTableau10);
  let sliceGenerator = d3.pie().value(d => d.value);
  let arcData = sliceGenerator(pieData);

  function arcGenerator(d) {
    let r = 50;
    let x1 = r * Math.cos(d.startAngle);
    let y1 = r * Math.sin(d.startAngle);
    let x2 = r * Math.cos(d.endAngle);
    let y2 = r * Math.sin(d.endAngle);
    let largeArc = d.endAngle - d.startAngle > Math.PI ? 1 : 0;

    return `
      M 0 0
      L ${x1} ${y1}
      A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}
      Z
    `;
  }

  arcData.forEach((d, i) => {
    svg.append('path')
      .attr('d', arcGenerator(d))
      .attr('fill', colors(i))
      .attr('class', 'wedge')
      .on('click', () => {
        selectedIndex = selectedIndex === i ? -1 : i;

        svg.selectAll('path')
          .attr('class', (_, idx) => idx === selectedIndex ? 'selected wedge' : 'wedge');

        legend.selectAll('li')
          .attr('class', (_, idx) => idx === selectedIndex ? 'selected legend-item' : 'legend-item')
          .style('--color', (_, idx) =>
            idx === selectedIndex ? 'oklch(60% 45% 0)' : colors(idx)
          );

        applyCombinedFilters();
      });
  });

  pieData.forEach((d, i) => {
    legend.append('li')
      .attr('style', `--color:${colors(i)}`)
      .attr('class', 'legend-item')
      .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });
}

// Shared Filtering Logic 
function applyCombinedFilters() {
  let filtered = projects;

  // Filter by pie chart
  if (selectedIndex !== -1) {
    const selectedYear = d3.rollups(projects, v => v.length, d => d.year)
      .map(([year]) => year)[selectedIndex]; 
    filtered = filtered.filter(p => p.year === selectedYear);
  }

  // Filter by search
  if (query) {
    filtered = filtered.filter(project => {
      let values = Object.values(project).join('\n').toLowerCase();
      return values.includes(query.toLowerCase());
    });
  }
  renderProjects(filtered, projectsContainer, 'h2');
}

// Search Handling
let searchInput = document.querySelector('.searchBar');
searchInput.addEventListener('input', (event) => {
  query = event.target.value;
  applyCombinedFilters();
});