const CONFIG = {
  CHART: {
    LETTERS: ["A", "B", "C", "D", "E"],
    NUMBERS: ["1", "2", "3", "4"],
    MAX_VALUE: 1000,
    VALUE_STEP: 100,
    HUE_STEP: 100,
  },
  COLORS: {
    TEXT: "#fff",
    BORDER: "#3c3c3c",
    CORRECT: "lightgreen",
    INCORRECT: "red",
  },
  PERCENTAGES: {
    PROJECTED_INCREASE: 1.2,
    PERCENT_DECREASE: 0.7,
    PERCENT_REDUCTION: 0.6,
  },
};

const state = {
  questionTemplates: [],
  currentQuestion: null,
  currentAnswer: null,
  pageStartTime: Date.now(),
  lastSubmitTime: null,
  correctCount: 0,
  totalAttempts: 0,
  currentQuestionSubmitted: false,
};

class ChartManager {
  constructor(canvasId) {
    this.ctx = document.getElementById(canvasId).getContext("2d");
    this.chart = this.initializeChart();
  }

  initializeChart() {
    Chart.defaults.color = CONFIG.COLORS.TEXT;
    Chart.defaults.borderColor = CONFIG.COLORS.BORDER;

    return new Chart(this.ctx, {
      type: "line",
      data: {
        labels: CONFIG.CHART.NUMBERS,
        datasets: this.generateDatasets(),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              usePointStyle: true,
              boxWidth: 12,
              boxHeight: 12,
            },
          },
        },
        scales: {
          y: {
            title: { display: true },
            beginAtZero: true,
            max: CONFIG.CHART.MAX_VALUE,
            suggestedMax: CONFIG.CHART.MAX_VALUE,
          },
          x: {
            title: { display: true },
          },
        },
      },
    });
  }

  generateDatasets() {
    const dashPatterns = [
      [5, 1],
      [4, 2],
      [3, 3],
      [2, 4],
      [1, 5],
    ];

    const pointStyles = ["circle", "triangle", "rect", "cross", "star"];

    return CONFIG.CHART.LETTERS.map((letter, index) => ({
      label: letter,
      data: this.getRandomData(),
      borderColor: `hsl(${index * CONFIG.CHART.HUE_STEP}, 80%, 50%)`,
      borderDash: dashPatterns[index],
      pointStyle: pointStyles[index],
      pointRadius: 5,
      tension: 0,
      fill: false,
    }));
  }

  getRandomData() {
    return Array.from(
      { length: CONFIG.CHART.NUMBERS.length },
      () => Math.floor(Math.random() * 11) * CONFIG.CHART.VALUE_STEP
    );
  }

  getValue(letter, number) {
    const dataset = this.chart.data.datasets.find((d) => d.label === letter);
    const numberIndex = CONFIG.CHART.NUMBERS.indexOf(number);
    return dataset?.data[numberIndex] ?? 0;
  }

  randomize() {
    this.chart.data.datasets.forEach((dataset) => {
      dataset.data = this.getRandomData();
    });
    this.chart.update();
  }

  getDatasets() {
    return this.chart.data.datasets;
  }
}

class QuestionGenerator {
  constructor(chartManager) {
    this.chartManager = chartManager;
  }

  static pickRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  generateVariables(variableNames) {
    const vars = {};

    variableNames.forEach((varName) => {
      if (varName.startsWith("letter")) {
        vars[varName] = QuestionGenerator.pickRandom(CONFIG.CHART.LETTERS);
      }
      if (varName.startsWith("number")) {
        vars[varName] = QuestionGenerator.pickRandom(CONFIG.CHART.NUMBERS);
      }
    });

    if (vars.letterA && vars.letterB && vars.letterA === vars.letterB) {
      vars.letterB = CONFIG.CHART.LETTERS.find((c) => c !== vars.letterA);
    }

    return vars;
  }

  calculateAnswer(type, vars) {
    const { letterA, letterB, letter, number } = vars;

    switch (type) {
      case "difference":
        return (
          this.chartManager.getValue(letterA, number) -
          this.chartManager.getValue(letterB, number)
        );

      case "sum":
        return (
          this.chartManager.getValue(letterA, number) +
          this.chartManager.getValue(letterB, number)
        );

      case "projectedIncrease":
        return Math.round(
          this.chartManager.getValue(letter, number) *
            CONFIG.PERCENTAGES.PROJECTED_INCREASE
        );

      case "percentDecrease":
        return Math.round(
          this.chartManager.getValue(letter, number) *
            CONFIG.PERCENTAGES.PERCENT_DECREASE
        );

      case "percentReduction":
        return Math.round(
          this.chartManager.getValue(letter, number) *
            CONFIG.PERCENTAGES.PERCENT_REDUCTION
        );

      case "percentageOfTotal":
        return this.calculatePercentageOfTotal(letter, number);

      case "totalOvernumbers":
        return this.calculateTotalOverNumbers(letter);

      case "averageOvernumbers":
        return this.calculateAverageOverNumbers(letter);

      case "bestPerformer":
        return this.findBestPerformer();

      case "worstPerformer":
        return this.findWorstPerformer();

      default:
        return null;
    }
  }

  calculatePercentageOfTotal(letter, number) {
    const total = CONFIG.CHART.LETTERS.reduce(
      (sum, c) => sum + this.chartManager.getValue(c, number),
      0
    );

    if (total === 0) return "0%";

    const percentage = Math.round(
      (this.chartManager.getValue(letter, number) / total) * 100
    );
    return `${percentage}%`;
  }

  calculateTotalOverNumbers(letter) {
    return CONFIG.CHART.NUMBERS.reduce(
      (sum, num) => sum + this.chartManager.getValue(letter, num),
      0
    );
  }

  calculateAverageOverNumbers(letter) {
    const total = this.calculateTotalOverNumbers(letter);
    return Math.round(total / CONFIG.CHART.NUMBERS.length);
  }

  findBestPerformer() {
    return this.findPerformer(true);
  }

  findWorstPerformer() {
    return this.findPerformer(false);
  }

  findPerformer(isBest) {
    const totals = this.chartManager.getDatasets().map((dataset) => ({
      letter: dataset.label,
      total: dataset.data.reduce((a, b) => a + b, 0),
    }));

    totals.sort((a, b) => (isBest ? b.total - a.total : a.total - b.total));
    return totals[0].letter;
  }

  generate() {
    if (!state.questionTemplates.length) {
      console.warn("No question templates loaded");
      return;
    }

    const template = QuestionGenerator.pickRandom(state.questionTemplates);
    const variables = this.generateVariables(template.variables);
    const answer = this.calculateAnswer(template.type, variables);

    let questionText = template.template;
    Object.entries(variables).forEach(([key, value]) => {
      questionText = questionText.replace(`{${key}}`, value);
    });

    state.currentQuestion = questionText;
    state.currentAnswer = answer;

    return { question: questionText, answer };
  }
}

class UIController {
  constructor() {
    this.elements = {
      questionDisplay: document.querySelector(".questions"),
      answerInput: document.getElementById("answerInput"),
      feedback: document.getElementById("feedback"),
      answerDiv: document.getElementById("answer"),
      score: document.getElementById("score"),
      lastTime: document.getElementById("last-time"),
      totalTime: document.getElementById("total-time"),
    };
  }

  displayQuestion(question, answer) {
    this.elements.questionDisplay.innerHTML = `
      <strong>${question}</strong><br>
      <div id="answer" style="display:none;">Answer: ${answer}</div>
    `;
    this.clearInput();
    this.clearFeedback();
    this.updateAnswerElement();
  }

  updateAnswerElement() {
    this.elements.answerDiv = document.getElementById("answer");
  }

  clearInput() {
    this.elements.answerInput.value = "";
  }

  clearFeedback() {
    this.elements.feedback.textContent = "";
    this.elements.feedback.style.color = "";
  }

  showAnswer() {
    if (this.elements.answerDiv) {
      this.elements.answerDiv.style.display = "block";
    }
  }

  showFeedback(isCorrect) {
    this.elements.feedback.textContent = isCorrect ? "Correct" : "Wrong";
    this.elements.feedback.style.color = isCorrect
      ? CONFIG.COLORS.CORRECT
      : CONFIG.COLORS.INCORRECT;
  }

  updateScore() {
    this.elements.score.textContent = `Score : ${state.correctCount}/${state.totalAttempts}`;
  }

  updateLastTime(seconds) {
    this.elements.lastTime.textContent = `Last time spent : ${this.formatTime(
      seconds
    )}`;
  }

  updateTotalTime() {
    const totalSeconds = (Date.now() - state.pageStartTime) / 1000;
    this.elements.totalTime.textContent = `Total time spent : ${this.formatTime(
      totalSeconds
    )}`;
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0"
    )}`;
  }

  getUserAnswer() {
    return this.elements.answerInput.value;
  }
}

class AnswerValidator {
  static normalize(answer, expectedHasPercent = false) {
    if (answer == null) return "";

    let normalized = String(answer).trim().toLowerCase();
    normalized = normalized.replace(/,/g, "");

    const num = parseFloat(normalized.replace("%", ""));
    if (!isNaN(num)) {
      if (expectedHasPercent) {
        return `${Math.abs(num)}%`;
      } else {
        return Math.abs(num);
      }
    }

    return normalized;
  }

  static isCorrect(userAnswer, correctAnswer) {
    const normalizedUser = this.normalize(userAnswer);
    const normalizedCorrect = this.normalize(correctAnswer);
    return normalizedUser === normalizedCorrect;
  }
}

class QuizApp {
  constructor() {
    this.chartManager = new ChartManager("chart");
    this.questionGenerator = new QuestionGenerator(this.chartManager);
    this.uiController = new UIController();
    this.initialize();
  }

  async initialize() {
    await this.loadQuestionTemplates();
    this.setupEventListeners();
    this.startTimers();
    this.generateNewQuestion();
  }

  async loadQuestionTemplates() {
    try {
      const response = await fetch("q.json");
      state.questionTemplates = await response.json();
    } catch (error) {
      console.error("Failed to load question templates:", error);
    }
  }

  setupEventListeners() {
    document
      .getElementById("questionButton")
      .addEventListener("click", () => this.generateNewQuestion());

    document
      .getElementById("answerButton")
      .addEventListener("click", () => this.uiController.showAnswer());

    document
      .getElementById("randomizeButton")
      .addEventListener("click", () => this.handleRandomize());

    document
      .getElementById("submitAnswerButton")
      .addEventListener("click", () => this.handleSubmit());

    this.uiController.elements.answerInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.handleSubmit();
    });
  }

  startTimers() {
    setInterval(() => this.uiController.updateTotalTime(), 1000);
  }

  generateNewQuestion() {
    const result = this.questionGenerator.generate();
    if (result) {
      this.uiController.displayQuestion(result.question, result.answer);

      state.currentQuestionSubmitted = false;
    }
  }

  handleRandomize() {
    this.chartManager.randomize();
    this.generateNewQuestion();
  }

  handleSubmit() {
    if (state.currentQuestionSubmitted) return;

    const userAnswer = this.uiController.getUserAnswer();
    const isCorrect = AnswerValidator.isCorrect(
      userAnswer,
      state.currentAnswer
    );

    state.totalAttempts++;
    if (isCorrect) state.correctCount++;

    this.uiController.updateScore();
    this.uiController.showFeedback(isCorrect);

    const now = Date.now();
    if (state.lastSubmitTime) {
      const elapsedSeconds = (now - state.lastSubmitTime) / 1000;
      this.uiController.updateLastTime(elapsedSeconds);
    }
    state.lastSubmitTime = now;

    state.currentQuestionSubmitted = true;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new QuizApp());
} else {
  new QuizApp();
}
