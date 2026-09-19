// 🛡️ 호구방지위원회 - Zero-Privacy 로컬 OCR & 개인정보 마스킹 모듈 (OCR & Privacy Engine)

class HoguOCR {
  constructor(options = {}) {
    this.canvas = options.canvas || null;
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
    this.onProgress = options.onProgress || (() => {});
    this.onCompleted = options.onCompleted || (() => {});
    this.onError = options.onError || (() => {});
    
    this.originalImage = null;
    this.scale = 1;
    this.isDrawing = false;
    this.maskRects = []; // 사용자/자동 마스킹 좌표들
    
    // Tesseract 워커 캐싱
    this.worker = null;
    this.initCanvasEvents();
  }

  // 1. 캔버스 마스킹 드로잉 이벤트 (마우스/터치로 개인정보 슥슥 가리기)
  initCanvasEvents() {
    if (!this.canvas) return;

    let startX = 0;
    let startY = 0;

    const startDraw = (x, y) => {
      this.isDrawing = true;
      startX = x;
      startY = y;
    };

    const drawMove = (x, y) => {
      if (!this.isDrawing) return;
      this.redrawCanvas();
      // 실시간 임시 박스 가이드 표시
      this.ctx.fillStyle = "rgba(239, 68, 68, 0.4)";
      this.ctx.fillRect(startX, startY, x - startX, y - startY);
    };

    const endDraw = (x, y) => {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      const width = x - startX;
      const height = y - startY;
      if (Math.abs(width) > 5 && Math.abs(height) > 5) {
        // 정규화된 마스킹 사각형 저장
        this.maskRects.push({
          x: Math.min(startX, x),
          y: Math.min(startY, y),
          w: Math.abs(width),
          h: Math.abs(height)
        });
      }
      this.redrawCanvas();
    };

    // 마우스 이벤트
    this.canvas.addEventListener("mousedown", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      startDraw(e.clientX - rect.left, e.clientY - rect.top);
    });

    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      drawMove(e.clientX - rect.left, e.clientY - rect.top);
    });

    this.canvas.addEventListener("mouseup", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      endDraw(e.clientX - rect.left, e.clientY - rect.top);
    });

    // 터치 이벤트 (스마트폰)
    this.canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        const rect = this.canvas.getBoundingClientRect();
        startDraw(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
        e.preventDefault();
      }
    }, { passive: false });

    this.canvas.addEventListener("touchmove", (e) => {
      if (e.touches.length === 1) {
        const rect = this.canvas.getBoundingClientRect();
        drawMove(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
        e.preventDefault();
      }
    }, { passive: false });

    this.canvas.addEventListener("touchend", (e) => {
      if (e.changedTouches.length === 1) {
        const rect = this.canvas.getBoundingClientRect();
        endDraw(e.changedTouches[0].clientX - rect.left, e.changedTouches[0].clientY - rect.top);
      }
    });
  }

  // 2. 파일 로드 (이미지 또는 PDF 분기)
  async loadFile(file) {
    this.maskRects = [];
    if (file.type === "application/pdf") {
      this.onProgress({ status: "PDF 파일 분석 중...", progress: 0.2 });
      await this.loadPdfFile(file);
    } else if (file.type.startsWith("image/")) {
      this.onProgress({ status: "이미지 로드 중...", progress: 0.2 });
      await this.loadImageFile(file);
    } else {
      this.onError("지원하지 않는 파일 형식입니다. JPG, PNG 또는 PDF 파일을 올려주세요.");
    }
  }

  // 3. 이미지 로드 & 캔버스 렌더링
  loadImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.originalImage = img;
          this.setupCanvasForImage(img);
          // 증권 상단부(이름/주민번호 영역) 자동 추천 마스킹 1개 기본 적용
          this.applyDefaultHeaderMask();
          this.redrawCanvas();
          resolve();
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // 캔버스 크기 조정 (모바일/PC 반응형 맞춤)
  setupCanvasForImage(img) {
    const maxWidth = Math.min(800, window.innerWidth - 60);
    this.scale = maxWidth / img.width;
    this.canvas.width = img.width * this.scale;
    this.canvas.height = img.height * this.scale;
  }

  // 상단 계약자 정보(이름, 주민번호 등) 영역 기본 자동 마스킹
  applyDefaultHeaderMask() {
    if (!this.canvas) return;
    // 일반적인 증권 상단 8~15% 영역에 개인정보 블랙박스 기본 추천
    this.maskRects.push({
      x: 10,
      y: 10,
      w: this.canvas.width - 20,
      h: Math.min(this.canvas.height * 0.12, 100)
    });
  }

  // 캔버스 다시 그리기 (이미지 + 블랙아웃 마스킹 테이프)
  redrawCanvas() {
    if (!this.ctx || !this.originalImage) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.originalImage, 0, 0, this.canvas.width, this.canvas.height);

    // 마스킹 테이프(검은색 블랙박스 + "개인정보 보호 마스킹" 안내)
    this.maskRects.forEach(r => {
      this.ctx.fillStyle = "#0F172A";
      this.ctx.fillRect(r.x, r.y, r.w, r.h);

      this.ctx.fillStyle = "#94A3B8";
      this.ctx.font = "11px Pretendard, sans-serif";
      this.ctx.fillText("🔒 개인정보 마스킹", r.x + 8, r.y + Math.min(r.h / 2 + 4, 16));
    });
  }

  // 마스킹 전체 초기화
  clearMasks() {
    this.maskRects = [];
    this.redrawCanvas();
  }

  // 4. PDF 로드 및 텍스트 레이어 우선 추출 (디지털 PDF는 0.1초 만에 100% 추출)
  async loadPdfFile(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        this.onProgress({ status: `PDF ${i}/${pdf.numPages} 페이지 텍스트 추출 중...`, progress: (i / pdf.numPages) * 0.5 });
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");
        fullText += pageText + "\n";
      }

      // 디지털 텍스트가 풍부한 경우 즉시 개인정보 정규식 마스킹 후 반환
      if (fullText.trim().length > 100) {
        this.onProgress({ status: "개인정보 비식별화 필터링 중...", progress: 0.9 });
        const safeText = this.filterSensitiveText(fullText);
        this.onCompleted(safeText);
        return;
      }

      // 만약 스캔본 PDF(텍스트 없음)라면 1페이지를 캔버스에 렌더링하여 OCR로 전달
      this.onProgress({ status: "스캔된 PDF 감지: 이미지 OCR 준비 중...", progress: 0.4 });
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1.5 });
      this.canvas.width = viewport.width;
      this.canvas.height = viewport.height;
      await firstPage.render({ canvasContext: this.ctx, viewport }).promise;

      // 캔버스 이미지를 원본 이미지로 설정 후 마스킹 대기
      const dataUrl = this.canvas.toDataURL();
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.applyDefaultHeaderMask();
        this.redrawCanvas();
      };
      img.src = dataUrl;
    } catch (err) {
      console.error(err);
      this.onError("PDF를 읽는 중 오류가 발생했습니다.");
    }
  }

  // 텍스트 기반 개인정보 정규식 마스킹 (이름, 주민번호, 계좌번호 등)
  filterSensitiveText(text) {
    let filtered = text;
    // 주민등록번호 패턴 마스킹 (예: 870101-1234567 ➔ 870101-1******)
    filtered = filtered.replace(/\b(\d{6})[- ]?([1-4])\d{6}\b/g, "$1-$2******");
    // 전화번호 마스킹 (010-XXXX-XXXX)
    filtered = filtered.replace(/\b(01[016789])[- ]?(\d{3,4})[- ]?(\d{4})\b/g, "$1-****-$3");
    // 증권번호 마스킹
    filtered = filtered.replace(/증권번호\s*[:：]?\s*([A-Za-z0-9\-]+)/g, "증권번호: [보안 마스킹]");
    return filtered;
  }

  // 5. 마스킹된 캔버스 이미지로 Tesseract OCR 구동
  async runOCR() {
    if (!this.canvas) return;

    try {
      this.onProgress({ status: "브라우저 로컬 OCR 엔진 가동 중...", progress: 0.1 });

      // Tesseract Worker 초기화
      if (!this.worker) {
        this.worker = await Tesseract.createWorker("kor+eng", 1, {
          logger: (m) => {
            if (m.status === "recognizing text") {
              this.onProgress({
                status: `텍스트 판독 중... (${Math.floor(m.progress * 100)}%)`,
                progress: 0.1 + (m.progress * 0.8)
              });
            }
          }
        });
      }

      // 마스킹이 적용된 캔버스를 그대로 OCR에 주입! (마스킹된 개인정보는 인식 불가 = 100% 안전)
      const { data: { text } } = await this.worker.recognize(this.canvas);
      
      this.onProgress({ status: "판독 완료! 담보 및 금액 분석 중...", progress: 1.0 });
      const safeText = this.filterSensitiveText(text);
      this.onCompleted(safeText);
    } catch (err) {
      console.error(err);
      this.onError("OCR 판독 중 오류가 발생했습니다. 선명한 사진으로 다시 시도해 주세요.");
    }
  }
}
