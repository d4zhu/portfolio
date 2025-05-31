import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let xScale, yScale;
let commitProgress = 100;
let timeScale;
let filteredCommits = [];

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      const first = lines[0];
      const { author, date, time, timezone, datetime } = first;

      const ret = {
        id: commit,
        url: 'https://github.com/vis-society/lab-7/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        enumerable: false,
        writable: false,
        configurable: false,
      });

      return ret;
    });
}

function renderTooltipContent(commit) {
  if (!commit) return;
  document.getElementById('commit-link').href = commit.url;
  document.getElementById('commit-link').textContent = commit.id;
  document.getElementById('commit-date').textContent = commit.datetime?.toLocaleDateString('en', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  });
  document.getElementById('commit-time').textContent = commit.datetime?.toLocaleTimeString('en', {
    hour: '2-digit', minute: '2-digit'
  });
  document.getElementById('commit-author').textContent = commit.author;
  document.getElementById('commit-lines').textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  document.getElementById('commit-tooltip').hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX + 10}px`;
  tooltip.style.top = `${event.clientY + 10}px`;
}

function isCommitSelected(selection, commit) {
  if (!selection) return false;
  const [[x0, y0], [x1, y1]] = selection;
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function renderSelectionCount(selection, commits) {
  const selected = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const count = document.getElementById('selection-count');
  count.textContent = `${selected.length || 'No'} commits selected`;
  return selected;
}

function renderLanguageBreakdown(selection, commits) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const container = document.getElementById('language-breakdown');
  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }

  const lines = selectedCommits.flatMap(d => d.lines);
  const breakdown = d3.rollup(lines, v => v.length, d => d.type);

  container.innerHTML = '';
  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);
    container.innerHTML += `
      <dt>${language}</dt>
      <dd>${count} lines (${formatted})</dd>
    `;
  }
}

function brushed(event) {
  const selection = event.selection;
  d3.selectAll('circle').classed('selected', d =>
    isCommitSelected(selection, d)
  );
  renderSelectionCount(selection, window._allCommits);
  renderLanguageBreakdown(selection, window._allCommits);
}

function renderCommitInfo(data, commits) {
  const container = d3.select('#stats').append('div');

  const workByPeriod = d3.rollups(
    data,
    v => v.length,
    d => new Date(d.datetime).toLocaleString('en', { dayPeriod: 'short' })
  );
  const mostActivePeriod = d3.greatest(workByPeriod, d => d[1])?.[0];
  const formattedPeriod = mostActivePeriod.charAt(0).toUpperCase() + mostActivePeriod.slice(1);
  const longestLineLength = d3.max(data, d => d.length);

  const stats = [
    { label: 'COMMITS', value: commits.length },
    { label: 'FILES', value: d3.groups(data, d => d.file).length },
    { label: 'TOTAL LOC', value: data.length },
    { label: 'LONGEST LINE', value: `${longestLineLength} chars` },
    { label: 'MOST ACTIVE TIME', value: formattedPeriod },
  ];

  const dl = container.append('dl').attr('id', 'github-stats');
  stats.forEach(stat => {
    dl.append('dt').text(stat.label);
    dl.append('dd').text(stat.value);
  });
}

function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  timeScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([0, 100]);

  d3.select("#commit-progress").on("input", onTimeSliderChange);

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const sortedCommits = d3.sort(commits, d => -d.totalLines);

  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  svg.append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .attr('class', 'x-axis')
    .call(d3.axisBottom(xScale));

  svg.append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .attr('class', 'y-axis')
    .call(d3.axisLeft(yScale).tickFormat(d => String(d % 24).padStart(2, '0') + ':00'));

  svg.append('g')
    .attr('class', 'dots')
    .selectAll('circle')
    .data(sortedCommits, d => d.id)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .each(function(d) {
      this.style.setProperty('--r', rScale(d.totalLines));
    })
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', updateTooltipPosition)
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });

  const brush = d3.brush().on('start brush end', brushed);
  svg.call(brush);
  svg.selectAll('.dots, .overlay ~ *').raise();
}

function onTimeSliderChange() {
  commitProgress = +d3.select("#commit-progress").property("value");
  const commitMaxTime = timeScale.invert(commitProgress);

  d3.select("#commit-time").text(
    commitMaxTime.toLocaleString(undefined, {
      dateStyle: "long",
      timeStyle: "short"
    })
  );

  filteredCommits = window._allCommits.filter(d => d.datetime <= commitMaxTime);
  updateScatterPlot(filteredCommits);
  updateFileDisplay(filteredCommits);
}

function updateScatterPlot(commits) {
  const svg = d3.select("#chart").select("svg");

  xScale = xScale.domain(d3.extent(commits, (d) => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const xAxis = d3.axisBottom(xScale);
  const xAxisGroup = svg.select("g.x-axis");
  xAxisGroup.selectAll("*").remove();
  xAxisGroup.call(xAxis);

  const dots = svg.select("g.dots");
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  dots.selectAll("circle")
    .data(sortedCommits, (d) => d.id)
    .join("circle")
    .attr("cx", (d) => xScale(d.datetime))
    .attr("cy", (d) => yScale(d.hourFrac))
    .attr("r", (d) => rScale(d.totalLines))
    .attr("fill", "steelblue")
    .style("fill-opacity", 0.7)
    .each(function(d) {
      this.style.setProperty("--r", rScale(d.totalLines));
    });
}

function updateFileDisplay(filteredCommits) {
  let lines = filteredCommits.flatMap((d) => d.lines);
  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    })
    .sort((a, b) => b.lines.length - a.lines.length);

  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  const filesContainer = d3
    .select('#files')
    .selectAll('div')
    .data(files, (d) => d.name)
    .join(
      enter => enter.append('div').call(div => {
        div.append('dt').append('code');
        div.append('dd');
      })
    );

  filesContainer.select('dt > code')
    .html(d => `${d.name}<br><small style="display:block;opacity:0.6;font-size:0.85em">${d.lines.length} lines</small>`);

  filesContainer
    .attr('style', d => `--color: ${colors(d.lines[0]?.type || "unknown")};`);

  filesContainer.select('dd')
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc');
}

(async function () {
  const data = await loadData();
  const commits = processCommits(data);
  window._allCommits = commits;

  renderCommitInfo(data, commits);
  renderScatterPlot(data, commits);
  updateFileDisplay(commits);

  // Add commit narration after other elements are rendered
  d3.select('#scatter-story')
    .selectAll('.step')
    .data(commits)
    .join('div')
    .attr('class', 'step')
    .style('padding-bottom', '4rem')
    .html(
      (d, i) => `
        <p>
          On ${d.datetime.toLocaleString('en', {
            dateStyle: 'full',
            timeStyle: 'short',
          })}, I made 
          <a href="${d.url}" target="_blank">
            ${i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}
          </a>.<br>
          I edited ${d.totalLines} lines across 
          ${d3.rollups(d.lines, D => D.length, d => d.file).length} files.<br>
          Then I looked over all I had made, and I saw that it was very good.
        </p>
      `
    );

  function onStepEnter(response) {
  const commit = response.element.__data__;
  console.log(commit.datetime); // For debugging

  // Filter commits up to this one
  const filtered = window._allCommits.filter(d => d.datetime <= commit.datetime);

  updateScatterPlot(filtered);
  updateFileDisplay(filtered);
}

const scroller = scrollama();
scroller
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
  })
  .onStepEnter(onStepEnter);

  // Scrollytelling for file breakdown
d3.select('#files-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .style('padding-bottom', '4rem')
  .html((d, i) => `
    <p>
        On ${d.datetime.toLocaleString('en', {
          dateStyle: 'full',
          timeStyle: 'short',
        })}, I made 
        <a href="${d.url}" target="_blank">
          ${i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}
        </a>.<br>
        I edited ${d.totalLines} lines across 
        ${d3.rollups(d.lines, D => D.length, d => d.file).length} files.<br>
        Then I looked over all I had made, and I saw that it was very good.
    </p>
  `);

function onFileStepEnter(response) {
  const commit = response.element.__data__;
  const filtered = window._allCommits.filter(d => d.datetime <= commit.datetime);
  updateFileDisplay(filtered);
}

const fileScroller = scrollama();
fileScroller
  .setup({
    container: '#scrolly-2',
    step: '#scrolly-2 .step',
  })
  .onStepEnter(onFileStepEnter);
})();

