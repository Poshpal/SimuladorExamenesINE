// ==================== VARIABLES GLOBALES ====================
let allQuestions = [];
let selectedQuestions = [];
let currentQuestion = 0;
let userAnswers = [];

let timerInterval = null;
let totalTimeSeconds = 0;
let correctCount = 0;          // ← agrega esta línea

const DOM = {
    startScreen: document.getElementById('start-screen'),
    examContent: document.getElementById('exam-content'),
    numQuestions: document.getElementById('num-questions'),
    categorySelect: document.getElementById('category-select'),
    startBtn: document.getElementById('start-btn'),
    startError: document.getElementById('start-error'),
    totalInfo: document.getElementById('total-questions-info'),

    progress: document.getElementById('progress'),
    counter: document.getElementById('question-counter'),
    questionText: document.getElementById('question-text'),
    options: document.getElementById('options'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    quizContainer: document.getElementById('quiz-container'),
    results: document.getElementById('results'),
    score: document.getElementById('score'),
    review: document.getElementById('review'),
    tiempoResultado: document.getElementById('tiempo-resultado'),
    timerDisplay: document.getElementById('timer-display'),
    tiempoIdeal: document.getElementById('tiempo-ideal'),
    restartBtn: document.getElementById('restart-btn'),
    mapButtons: document.getElementById('map-buttons')
};

// ==================== UTILIDADES ====================
function shuffleArray(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function getRandomQuestions(array, n) {
    return [...array].sort(() => 0.5 - Math.random()).slice(0, n);
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min} min ${sec.toString().padStart(2, '0')} s`;
}

// ==================== TEMPORIZADOR ====================
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    totalTimeSeconds = 0;
    timerInterval = setInterval(() => {
        totalTimeSeconds++;
        const min = Math.floor(totalTimeSeconds / 60).toString().padStart(2, '0');
        const sec = (totalTimeSeconds % 60).toString().padStart(2, '0');
        DOM.timerDisplay.textContent = `${min}:${sec}`;
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ==================== CARGAR PREGUNTAS ====================
async function loadAllQuestions() {
    try {
        const res = await fetch('preguntas.json');
        allQuestions = await res.json();
        DOM.totalInfo.textContent = `Hay ${allQuestions.length} preguntas disponibles en el banco.`;
    } catch (e) {
        DOM.startError.textContent = "No se pudo cargar preguntas.json";
        DOM.startError.classList.remove('hidden');
        DOM.startBtn.disabled = true;
    }

    const counts = {};

allQuestions.forEach(q => {
    const cat = q.categoria || "Sin categoría";
    counts[cat] = (counts[cat] || 0) + 1;
});

// Orden sugerido de visualización
const order = [
    "Sistema Electoral",
    "Sistema Político",
    "Matemáticas",
    "Lenguaje y Comunicación",
    "Sin categoría"
];

let breakdownText = '';
order.forEach(cat => {
    if (counts[cat] > 0) {
        if (breakdownText) breakdownText += '   ·   ';
        breakdownText += `<strong>${cat}:</strong> ${counts[cat]}`;
    }
});

// Agregar las que no estén en la lista (por si hay otras)
Object.keys(counts).forEach(cat => {
    if (!order.includes(cat) && counts[cat] > 0) {
        if (breakdownText) breakdownText += '   ·   ';
        breakdownText += `<strong>${cat}:</strong> ${counts[cat]}`;
    }
});

document.getElementById('category-breakdown').innerHTML = breakdownText || 'No se detectaron categorías';
}

// ==================== INICIAR EXAMEN ====================
function startExam() {
    const desired = parseInt(DOM.numQuestions.value);
    const selectedCategory = DOM.categorySelect.value;

    if (isNaN(desired) || desired < 1) {
        DOM.startError.textContent = "Ingresa un número válido (mínimo 1)";
        DOM.startError.classList.remove('hidden');
        return;
    }

    let questionsToUse = allQuestions;
    if (selectedCategory !== "Todas") {
        questionsToUse = allQuestions.filter(q => q.categoria === selectedCategory);
    }

    if (questionsToUse.length === 0) {
        DOM.startError.textContent = `No hay preguntas en la categoría "${selectedCategory}"`;
        DOM.startError.classList.remove('hidden');
        return;
    }

    if (desired > questionsToUse.length) {
        DOM.startError.textContent = `Solo hay ${questionsToUse.length} preguntas en esta categoría`;
        DOM.startError.classList.remove('hidden');
        return;
    }

    DOM.startError.classList.add('hidden');

    // Seleccionar preguntas aleatorias de la categoría
    selectedQuestions = getRandomQuestions(questionsToUse, desired);
    userAnswers = new Array(selectedQuestions.length).fill(null);
    currentQuestion = 0;

    // Tiempo ideal (1.5 minutos por pregunta)
    const tiempoIdealMin = (desired * 1.5).toFixed(1);
    DOM.tiempoIdeal.textContent = `${tiempoIdealMin} minutos`;

    startTimer();

    DOM.startScreen.classList.add('hidden');
    DOM.examContent.classList.remove('hidden');

    renderQuestion();
}

// ==================== RENDERIZAR PREGUNTA ====================
function renderQuestion() {
    const q = selectedQuestions[currentQuestion];

    DOM.counter.textContent = `Pregunta ${currentQuestion + 1} de ${selectedQuestions.length}`;
    DOM.progress.style.width = `${((currentQuestion + 1) / selectedQuestions.length) * 100}%`;

    DOM.questionText.textContent = q.text;
    DOM.options.innerHTML = '';

    DOM.questionText.innerHTML = `
        <div class="question-number">Pregunta ${currentQuestion + 1}</div>
        ${q.text}
    `;

    const shuffledOptions = shuffleArray(q.options);

    shuffledOptions.forEach(option => {
        const originalIndex = q.options.indexOf(option);

        const label = document.createElement('label');
        label.className = 'option-label';
        label.innerHTML = `
            <input type="radio" name="answer" value="${originalIndex}" 
                   ${userAnswers[currentQuestion] === originalIndex ? 'checked' : ''}>
            ${option.text}
        `;

        label.querySelector('input').addEventListener('change', () => {
            userAnswers[currentQuestion] = originalIndex;
            renderMap();
        });

        DOM.options.appendChild(label);
    });

    DOM.prevBtn.disabled = currentQuestion === 0;
    DOM.nextBtn.textContent = currentQuestion === selectedQuestions.length - 1 
        ? 'Finalizar examen' 
        : 'Siguiente →';

    renderMap();
}

function renderMap() {
    DOM.mapButtons.innerHTML = '';
    selectedQuestions.forEach((_, i) => {
        const btn = document.createElement('div');
        btn.className = `map-btn ${userAnswers[i] !== null ? 'answered' : ''} ${i === currentQuestion ? 'current' : ''}`;
        btn.textContent = i + 1;
        btn.onclick = () => { currentQuestion = i; renderQuestion(); };
        DOM.mapButtons.appendChild(btn);
    });
}

// ==================== RESULTADOS ====================
function showResults() {
    stopTimer();

    DOM.quizContainer.classList.add('hidden');
    DOM.results.classList.remove('hidden');

    correctCount = 0;
    let html = '';

    selectedQuestions.forEach((q, i) => {
        const userIndex = userAnswers[i];
        const isCorrect = userIndex !== null && q.options[userIndex]?.correct === true;
        if (isCorrect) correctCount++;

        const userText = userIndex !== null ? q.options[userIndex].text : '(sin responder)';
        const correctText = q.options.find(opt => opt.correct)?.text || '(no definida)';

        html += `
            <div class="review-item ${isCorrect ? 'correct' : 'incorrect'}">
                <strong>Pregunta ${i + 1}:</strong> ${q.text}<br><br>
                <strong>Tu respuesta:</strong> ${userText}<br>
                <strong>Respuesta correcta:</strong> ${correctText}<br>
                ${q.sustento ? `<div class="sustento"><strong>Sustento legal:</strong><br>${q.sustento}</div>` : ''}
            </div>
        `;
    });

    const percentage = Math.round((correctCount / selectedQuestions.length) * 100);
    DOM.score.innerHTML = `${correctCount}/${selectedQuestions.length} <span style="font-size:1.5rem">(${percentage}%)</span>`;

    // Tiempo final
    const tiempoIdealSeg = selectedQuestions.length * 90; // 1.5 min = 90 seg
    const diff = totalTimeSeconds - tiempoIdealSeg;

    let msg = `Tiempo empleado: <strong>${formatTime(totalTimeSeconds)}</strong><br>`;
    msg += `Tiempo ideal: <strong>${formatTime(tiempoIdealSeg)}</strong><br>`;

    if (diff > 60) msg += `<span style="color:#c62828">+${formatTime(diff)} (lento)</span>`;
    else if (diff < -60) msg += `<span style="color:#2e7d32">-${formatTime(Math.abs(diff))} (rápido)</span>`;
    else msg += `<span style="color:#00695c">¡Tiempo excelente! ✓</span>`;

    DOM.tiempoResultado.innerHTML = msg;
    DOM.review.innerHTML = html;
}

// ==================== NAVEGACIÓN ====================
function nextQuestion() {
    if (currentQuestion < selectedQuestions.length - 1) {
        currentQuestion++;
        renderQuestion();
    } else {
        showResults();
    }
}

function prevQuestion() {
    if (currentQuestion > 0) {
        currentQuestion--;
        renderQuestion();
    }
}

// ==================== REINICIAR ====================
function resetExam() {
    stopTimer();
    DOM.timerDisplay.textContent = '00:00';
    DOM.tiempoIdeal.textContent = '—';

    currentQuestion = 0;
    userAnswers = [];
    selectedQuestions = [];

    DOM.results.classList.add('hidden');
    DOM.examContent.classList.add('hidden');
    DOM.startScreen.classList.remove('hidden');
    location.reload();
}

// ---------------------- Generar PDF ----------------------
async function generatePDF() {
    
    if (typeof window.jspdf === 'undefined') {
        alert("jsPDF no se cargó correctamente. Revisa la consola (F12) y tu conexión.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    try {
        // Título
        doc.setFontSize(18);
        doc.setTextColor(0, 105, 92);
        doc.text("Resultados - Simulador INE", pageWidth / 2, y, { align: "center" });
        y += 12;

        // Datos básicos
        doc.setFontSize(11);
        doc.setTextColor(80);
        doc.text(`Fecha: ${new Date().toLocaleString('es-MX')}`, margin, y); y += 8;
        doc.text(`Preguntas: ${selectedQuestions.length}`, margin, y); y += 6;
        doc.text(`Tiempo empleado: ${formatTime(totalTimeSeconds)}`, margin, y); y += 8;

        // Calificación (usamos la variable global que ya calculamos)
        const percentage = Math.round((correctCount / selectedQuestions.length) * 100);
        doc.setFontSize(14);
        doc.setTextColor(38, 166, 154);
        doc.text(`Calificación: ${correctCount} / ${selectedQuestions.length} (${percentage}%)`, margin, y);
        y += 10;

        doc.setLineWidth(0.5);
        doc.setDrawColor(150);
        doc.line(margin, y, pageWidth - margin, y);
        y += 10;

        // Preguntas
        doc.setFontSize(12);
        doc.setTextColor(40);

        for (let i = 0; i < selectedQuestions.length; i++) {
            const q = selectedQuestions[i];
            const userIdx = userAnswers[i];
            const isCorrect = userIdx !== null && q.options[userIdx]?.correct === true;

            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.text(`Pregunta ${i + 1}:`, margin, y);
            doc.setFont("helvetica", "normal");

            const qLines = doc.splitTextToSize(q.text, pageWidth - margin * 2);
            doc.text(qLines, margin, y + 6);
            y += 5 + qLines.length * 7;

            // Tu respuesta
            doc.setTextColor(80);
            doc.text("Tu respuesta:", margin + 5, y);
            const uText = userIdx !== null ? q.options[userIdx].text : "(sin responder)";
            const uLines = doc.splitTextToSize(uText, pageWidth - margin * 3);
            doc.text(uLines, margin + 35, y);
            y += uLines.length * 7 + 4;

            // Correcta
            doc.setTextColor(0, 128, 0);
            doc.text("Correcta:", margin + 5, y);
            const cText = q.options.find(o => o.correct)?.text || "(no definida)";
            const cLines = doc.splitTextToSize(cText, pageWidth - margin * 3);
            doc.text(cLines, margin + 35, y);
            y += cLines.length * 7 + 6;

            if (q.sustento) {
                doc.setTextColor(0, 105, 92);
                doc.setFont("helvetica", "italic");
                doc.text("Sustento:", margin + 5, y);
                const sLines = doc.splitTextToSize(q.sustento, pageWidth - margin * 4);
                doc.text(sLines, margin + 35, y);
                y += sLines.length * 6 + 10;
            }

            if (y > 260) {
                doc.addPage();
                y = 20;
            }
        }

        // Pie de página
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(9);
            doc.setTextColor(120);
            doc.text(`Página ${i} de ${pageCount} • Simulador INE`, pageWidth / 2, 290, { align: "center" });
        }

        const filename = `resultados_simulador_ine_${new Date().toISOString().slice(0,10)}.pdf`;
        doc.save(filename);

    } catch (err) {
        console.error("Error al generar PDF:", err);
        alert("Ocurrió un error al generar el PDF. Revisa la consola (F12) para más detalles.");
    }
}

// Conectar el botón (asegúrate que esté después de que el DOM cargue)
document.addEventListener('DOMContentLoaded', () => {
    const pdfBtn = document.getElementById('export-pdf-btn');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', generatePDF);
        console.log("Botón PDF conectado correctamente");
    } else {
        console.warn("No se encontró el botón #export-pdf-btn");
    }
});

// ==================== EVENTOS ====================
DOM.startBtn.addEventListener('click', startExam);
DOM.numQuestions.addEventListener('keypress', e => { if (e.key === 'Enter') startExam(); });
DOM.prevBtn.addEventListener('click', prevQuestion);
DOM.nextBtn.addEventListener('click', nextQuestion);
DOM.restartBtn.addEventListener('click', resetExam);
//DOM.PdfBtn.addEventListener('click', generatePDF);

// ==================== INICIO ====================
loadAllQuestions();
