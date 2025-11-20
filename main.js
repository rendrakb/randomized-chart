let questionTemplates = [];
let currentQuestion = null;
let currentAnswer = null;

let pageStartTime = Date.now();
let lastSubmitTime = null;

let correctCount = 0;
let totalAttempts = 0;

const ctx = document.getElementById("chart").getContext("2d");

const letters = ["A", "B", "C", "D", "E"];
const numbers = ["1", "2", "3", "4"];

const getRandomData = () =>
  Array.from(
    { length: numbers.length },
    () => Math.floor(Math.random() * 11) * 100
  );

const generateDatasets = () =>
  letters.map((letter, index) => ({
    label: letter,
    data: getRandomData(),
    borderColor: `hsl(${index * 100}, 50%, 50%)`,
    fill: false,
  }));

Chart.defaults.color = "#fff";
Chart.defaults.borderColor = "#3c3c3c";

const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: numbers,
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
        },
      },
    },
    scales: {
      y: {
        title: {
          display: true,
        },
        beginAtZero: true,
        max: 1000,
        suggestedMax: 1000,
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

function getValue(letter, number) {
  const dataset = chart.data.datasets.find((d) => d.label === letter);
  const numberIndex = numbers.indexOf(number);
  return dataset?.data[numberIndex] ?? 0;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateQuestion() {
  if (!questionTemplates.length) return;

  const templateObj = pick(questionTemplates);
  const vars = {};

  templateObj.variables.forEach((v) => {
    if (v.startsWith("letter")) vars[v] = pick(letters);
    if (v.startsWith("number")) vars[v] = pick(numbers);
  });

  if (vars.letterA === vars.letterB) {
    vars.letterB = letters.find((c) => c !== vars.letterA);
  }

  switch (templateObj.type) {
    case "difference":
      currentAnswer =
        getValue(vars.letterA, vars.number) -
        getValue(vars.letterB, vars.number);
      break;
    case "projectedIncrease":
      currentAnswer = Math.round(getValue(vars.letter, vars.number) * 1.2);
      break;
    case "percentageOfTotal":
      const total = letters.reduce(
        (sum, c) => sum + getValue(c, vars.number),
        0
      );
      currentAnswer = total
        ? Math.round((getValue(vars.letter, vars.number) / total) * 100) + "%"
        : "0%";
      break;
    case "percentDecrease":
      currentAnswer = Math.round(getValue(vars.letter, vars.number) * 0.7);
      break;
    case "totalOvernumbers":
      currentAnswer = numbers.reduce(
        (sum, y) => sum + getValue(vars.letter, y),
        0
      );
      break;
    case "percentReduction":
      currentAnswer = Math.round(getValue(vars.letter, vars.number) * 0.6);
      break;
    case "averageOvernumbers":
      currentAnswer = Math.round(
        numbers.reduce((sum, y) => sum + getValue(vars.letter, y), 0) /
          numbers.length
      );
      break;
    case "bestPerformer":
      const totals = chart.data.datasets.map((d) => ({
        letter: d.label,
        total: d.data.reduce((a, b) => a + b, 0),
      }));
      totals.sort((a, b) => b.total - a.total);
      currentAnswer = totals[0].letter;
      break;
    case "worstPerformer":
      const totalsW = chart.data.datasets.map((d) => ({
        letter: d.label,
        total: d.data.reduce((a, b) => a + b, 0),
      }));
      totalsW.sort((a, b) => a.total - b.total);
      currentAnswer = totalsW[0].letter;
      break;
  }

  currentQuestion = templateObj.template;
  Object.entries(vars).forEach(([key, val]) => {
    currentQuestion = currentQuestion.replace(`{${key}}`, val);
  });

  document.querySelector(
    ".questions"
  ).innerHTML = `<strong>${currentQuestion}</strong><br><div id="answer" style="display:none;">Answer: ${currentAnswer}</div>`;

  document.getElementById("answerInput").value = "";
  document.getElementById("feedback").textContent = "";
  document.getElementById("feedback").style.color = "";
}

document
document.getElementById("questionButton").addEventListener("click", () => {
  generateQuestion();
  document.getElementById("answerInput").value = "";
  document.getElementById("feedback").textContent = "";
  document.getElementById("feedback").style.color = "";
});

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

  
  document.getElementById("answerInput").value = "";
  document.getElementById("feedback").textContent = "";
  document.getElementById("feedback").style.color = "";
});

function normalizeAnswer(ans) {
  if (ans == null) return "";
  ans = String(ans).trim().toLowerCase();
  ans = ans.replace(/,/g, "");

  if (ans.endsWith("%")) {
    let num = parseFloat(ans.replace("%", ""));
    if (isNaN(num)) return ans;
    return Math.abs(num) + "%";
  }

  let num = parseFloat(ans);
  if (!isNaN(num)) return Math.abs(num);

  return ans;
}

document.getElementById("submitAnswerButton").addEventListener("click", () => {
  const userInput = document.getElementById("answerInput").value;
  const feedback = document.getElementById("feedback");

  const user = normalizeAnswer(userInput);
  const correct = normalizeAnswer(currentAnswer);

  totalAttempts++;
  let isCorrect = user === correct;
  if (isCorrect) correctCount++;

  document.getElementById("score").textContent =
    `Score : ${correctCount}/${totalAttempts}`;

  const now = Date.now();
  if (lastSubmitTime) {
    const diffSec = (now - lastSubmitTime) / 1000;
    document.getElementById("last-time").textContent =
      "Last time spent : " + formatTime(diffSec);
  }
  lastSubmitTime = now;

  if (isCorrect) {
    feedback.textContent = "Correct!";
    feedback.style.color = "lightgreen";
  } else {
    feedback.textContent = `Wrong! Correct answer: ${currentAnswer}`;
    feedback.style.color = "red";
  }
});

document.getElementById("answerInput").value = "";
document.getElementById("feedback").textContent = "";

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

setInterval(() => {
  const now = Date.now();
  const totalSec = (now - pageStartTime) / 1000;
  document.getElementById("total-time").textContent =
    "Total time spent : " + formatTime(totalSec);
}, 1000);
