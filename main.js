let questionTemplates = [];
let currentQuestion = null;
let currentAnswer = null;

const ctx = document.getElementById('myChart').getContext('2d');

const countries = ['Jerman', 'Inggris', 'Prancis', 'Italia', 'Belanda'];
const years = ['Tahun 1', 'Tahun 2', 'Tahun 3', 'Tahun 4'];

const getRandomData = () =>
  Array.from({ length: years.length }, () => Math.floor(Math.random() * 11) * 100);

const generateDatasets = () =>
  countries.map((country, index) => ({
    label: country,
    data: getRandomData(),
    borderColor: `hsl(${index * 72}, 70%, 50%)`,
    fill: false
  }));

const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: years,
    datasets: generateDatasets()
  },
  options: {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Data'
      }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Angka'
        },
        beginAtZero: true,
        max: 1000
      },
      x: {
        title: {
          display: true,
          text: 'Tahun'
        }
      }
    }
  }
});

document.getElementById('randomizeButton').addEventListener('click', () => {
  chart.data.datasets.forEach(dataset => {
    dataset.data = getRandomData();
  });
  chart.update();
  generateQuestion();
});

fetch('q.json')
  .then(res => res.json())
  .then(data => {
    questionTemplates = data;
    generateQuestion();
  });

function getValue(country, year) {
  const dataset = chart.data.datasets.find(d => d.label === country);
  const yearIndex = years.indexOf(year);
  return dataset?.data[yearIndex] ?? 0;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateQuestion() {
  if (!questionTemplates.length) return;

  const templateObj = pick(questionTemplates);
  const vars = {};

  templateObj.variables.forEach(v => {
    if (v.startsWith('country')) vars[v] = pick(countries);
    if (v.startsWith('year')) vars[v] = pick(years);
  });

  if (vars.countryA === vars.countryB) {
    vars.countryB = countries.find(c => c !== vars.countryA);
  }

  switch (templateObj.type) {
    case 'difference':
      currentAnswer = getValue(vars.countryA, vars.year) - getValue(vars.countryB, vars.year);
      break;
    case 'projectedIncrease':
      currentAnswer = Math.round(getValue(vars.country, vars.year) * 1.1);
      break;
    case 'percentageOfTotal':
      const total = countries.reduce((sum, c) => sum + getValue(c, vars.year), 0);
      currentAnswer = total ? Math.round((getValue(vars.country, vars.year) / total) * 100) + '%' : '0%';
      break;
    case 'percentDecrease':
      currentAnswer = Math.round(getValue(vars.country, vars.year1) * 0.8);
      break;
    case 'totalOverYears':
      currentAnswer = years.reduce((sum, y) => sum + getValue(vars.country, y), 0);
      break;
    case 'percentReduction':
      currentAnswer = Math.round(getValue(vars.country, vars.year) * 0.85);
      break;
    case 'averageOverYears':
      currentAnswer = Math.round(years.reduce((sum, y) => sum + getValue(vars.country, y), 0) / years.length);
      break;
    case 'bestPerformer':
      const totals = chart.data.datasets.map(d => ({
        country: d.label,
        total: d.data.reduce((a, b) => a + b, 0)
      }));
      totals.sort((a, b) => b.total - a.total);
      currentAnswer = totals[0].country;
      break;
  }

  currentQuestion = templateObj.template;
  Object.entries(vars).forEach(([key, val]) => {
    currentQuestion = currentQuestion.replace(`{${key}}`, val);
  });

  document.querySelector('.questions').innerHTML = `<strong>${currentQuestion}</strong><br><div id="answer" style="display:none;">Jawaban: ${currentAnswer}</div>`;
}

document.getElementById('questionButton').addEventListener('click', generateQuestion);

document.getElementById('answerButton').addEventListener('click', () => {
  const answerDiv = document.getElementById('answer');
  if (answerDiv) {
    answerDiv.style.display = 'block';
  }
});