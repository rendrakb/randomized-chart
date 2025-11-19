let questionTemplates = [];
let currentQuestion = null;
let currentAnswer = null;

const ctx = document.getElementById("chart").getContext("2d");

const hurufs = ["A", "B", "C", "D", "E"];
const angkas = ["1", "2", "3", "4"];

const getRandomData = () =>
  Array.from(
    { length: angkas.length },
    () => Math.floor(Math.random() * 11) * 100
  );

const generateDatasets = () =>
  hurufs.map((huruf, index) => ({
    label: huruf,
    data: getRandomData(),
    borderColor: `hsl(${index * 100}, 50%, 50%)`,
    fill: false,
  }));

Chart.defaults.color = "#fff";
Chart.defaults.borderColor = "#3c3c3c";

const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: angkas,
    datasets: generateDatasets(),
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          padding: 10,
        }
      }
    },
    scales: {
      y: {
        title: {
          display: true,
        },
        beginAtZero: false,
        max: 1000,
      },
      x: {
        title: {
          display: true,
        },
      },
    },
  },
});

fetch("q.json")
  .then((res) => res.json())
  .then((data) => {
    questionTemplates = data;
    generateQuestion();
  });

function getValue(huruf, angka) {
  const dataset = chart.data.datasets.find((d) => d.label === huruf);
  const angkaIndex = angkas.indexOf(angka);
  return dataset?.data[angkaIndex] ?? 0;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateQuestion() {
  if (!questionTemplates.length) return;

  const templateObj = pick(questionTemplates);
  const vars = {};

  templateObj.variables.forEach((v) => {
    if (v.startsWith("huruf")) vars[v] = pick(hurufs);
    if (v.startsWith("angka")) vars[v] = pick(angkas);
  });

  if (vars.hurufA === vars.hurufB) {
    vars.hurufB = hurufs.find((c) => c !== vars.hurufA);
  }

  switch (templateObj.type) {
    case "difference":
      currentAnswer =
        getValue(vars.hurufA, vars.angka) - getValue(vars.hurufB, vars.angka);
      break;
    case "projectedIncrease":
      currentAnswer = Math.round(getValue(vars.huruf, vars.angka) * 1.1);
      break;
    case "percentageOfTotal":
      const total = hurufs.reduce((sum, c) => sum + getValue(c, vars.angka), 0);
      currentAnswer = total
        ? Math.round((getValue(vars.huruf, vars.angka) / total) * 100) + "%"
        : "0%";
      break;
    case "percentDecrease":
      currentAnswer = Math.round(getValue(vars.huruf, vars.angka1) * 0.8);
      break;
    case "totalOverangkas":
      currentAnswer = angkas.reduce(
        (sum, y) => sum + getValue(vars.huruf, y),
        0
      );
      break;
    case "percentReduction":
      currentAnswer = Math.round(getValue(vars.huruf, vars.angka) * 0.85);
      break;
    case "averageOverangkas":
      currentAnswer = Math.round(
        angkas.reduce((sum, y) => sum + getValue(vars.huruf, y), 0) /
          angkas.length
      );
      break;
    case "bestPerformer":
      const totals = chart.data.datasets.map((d) => ({
        huruf: d.label,
        total: d.data.reduce((a, b) => a + b, 0),
      }));
      totals.sort((a, b) => b.total - a.total);
      currentAnswer = totals[0].huruf;
      break;
  }

  currentQuestion = templateObj.template;
  Object.entries(vars).forEach(([key, val]) => {
    currentQuestion = currentQuestion.replace(`{${key}}`, val);
  });

  document.querySelector(
    ".questions"
  ).innerHTML = `<strong>${currentQuestion}</strong><br><div id="answer" style="display:none;">Jawaban: ${currentAnswer}</div>`;
}

document
  .getElementById("questionButton")
  .addEventListener("click", generateQuestion);

document.getElementById("answerButton").addEventListener("click", () => {
  const answerDiv = document.getElementById("answer");
  if (answerDiv) {
    answerDiv.style.display = "block";
  }
});

document.getElementById("randomizeButton").addEventListener("click", () => {
  chart.data.datasets.forEach((dataset) => {
    dataset.data = getRandomData();
  });
  chart.update();
  generateQuestion();
});
