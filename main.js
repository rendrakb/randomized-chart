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
});

