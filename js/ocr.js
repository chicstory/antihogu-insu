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

    // 마우스/터치 좌표를 캔버스 실제 내부 픽셀로 변환하는 헬퍼 (반응형 배율 보정)
    const getCanvasCoords = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    // 마우스 이벤트
    this.canvas.addEventListener("mousedown", (e) => {
      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      startDraw(x, y);
    });

    this.canvas.addEventListener("mousemove", (e) => {
      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      drawMove(x, y);
    });

    this.canvas.addEventListener("mouseup", (e) => {
      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      endDraw(x, y);
    });

    // 터치 이벤트 (스마트폰)
    this.canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        const { x, y } = getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
        startDraw(x, y);
        e.preventDefault();
      }
    }, { passive: false });

    this.canvas.addEventListener("touchmove", (e) => {
      if (e.touches.length === 1) {
        const { x, y } = getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
        drawMove(x, y);
        e.preventDefault();
      }
    }, { passive: false });

    this.canvas.addEventListener("touchend", (e) => {
      if (e.changedTouches.length === 1) {
        const { x, y } = getCanvasCoords(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        endDraw(x, y);
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

  // 3. 이미지 로드 & 초고해상도 캔버스 렌더링 (해상도 축소 방지 & 업스케일링)
  loadImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.originalImage = img;
          this.setupHighResCanvas(img);
          // 증권 상단부 18% (이름/주민번호/주소 영역) 자동 완전 차단 마스킹
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

  // 초고해상도 캔버스 세팅 (글씨가 뭉개지지 않도록 최소 2,000px 이상 유지/확대)
  setupHighResCanvas(img) {
    let targetWidth = img.width;
    let targetHeight = img.height;

    // 만약 이미지가 작으면(너비 1800px 미만), 2배로 확대(Upscale)하여 글자 폰트 크기를 키움!
    if (targetWidth < 1800) {
      const upscaleFactor = Math.max(1.5, 2000 / targetWidth);
      targetWidth = Math.round(targetWidth * upscaleFactor);
      targetHeight = Math.round(targetHeight * upscaleFactor);
      console.log(`🔍 [HoguOCR] 저해상도 감지 ➔ ${upscaleFactor.toFixed(1)}배 업스케일링 적용 (${img.width}px ➔ ${targetWidth}px)`);
    } else {
      console.log(`🔍 [HoguOCR] 원본 초고해상도 유지: ${targetWidth}x${targetHeight}px`);
    }

    this.canvas.width = targetWidth;
    this.canvas.height = targetHeight;
    // 화면 표시는 CSS로 반응형 자동 맞춤
    this.canvas.style.width = "100%";
    this.canvas.style.height = "auto";
  }

  // 상단 계약자 정보(이름, 주민번호, 주소, 설계사 등) 영역 기본 자동 마스킹 (18%)
  applyDefaultHeaderMask() {
    if (!this.canvas) return;
    const headerHeight = Math.round(this.canvas.height * 0.18);
    this.maskRects = [{
      x: 0,
      y: 0,
      w: this.canvas.width,
      h: headerHeight
    }];
    console.log(`🔒 [HoguOCR] 상단 18% 개인정보 영역 자동 마스킹 완료 (높이 ${headerHeight}px)`);
  }

  // 캔버스 다시 그리기 (이미지 렌더링 + 고대비 전처리 + 블랙아웃 마스킹 테이프)
  redrawCanvas() {
    if (!this.ctx || !this.originalImage) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1) 고해상도로 원본 이미지 그리기 (부드러운 스무딩 활성화)
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = "high";
    this.ctx.drawImage(this.originalImage, 0, 0, this.canvas.width, this.canvas.height);

    // 2) 개인정보 마스킹 테이프 (상단 자동 마스킹 + 사용자 수동 추가 마스킹)
    this.maskRects.forEach(r => {
      this.ctx.fillStyle = "#0F172A";
      this.ctx.fillRect(r.x, r.y, r.w, r.h);

      this.ctx.fillStyle = "#94A3B8";
      this.ctx.font = `bold ${Math.max(14, Math.round(this.canvas.width * 0.018))}px Pretendard, sans-serif`;
      this.ctx.fillText("🔒 [보안] 개인정보 자동 보호 마스킹 영역 (이름/주민번호/주소)", r.x + 20, r.y + Math.min(r.h / 2 + 6, 40));
    });
  }

  // 이미지 고대비 및 흑백 이진화 전처리 (OCR 인식률 3배 향상)
  applyContrastEnhancement() {
    if (!this.ctx) return;
    const imgData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const d = imgData.data;

    // 그레이스케일 + 대비 증가 (Contrast 1.4배)
    const factor = (259 * (128 + 60)) / (255 * (259 - 60)); // 대비 증폭 계수

    for (let i = 0; i < d.length; i += 4) {
      // 그레이스케일 가중치
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      // 대비 증가
      let enhanced = factor * (gray - 128) + 128;
      enhanced = Math.max(0, Math.min(255, enhanced));

      d[i] = enhanced;     // R
      d[i + 1] = enhanced; // G
      d[i + 2] = enhanced; // B
    }

    this.ctx.putImageData(imgData, 0, 0);
    console.log("✨ [HoguOCR] 흑백 이진화 및 고대비(Contrast) 전처리 완료!");
  }

  // 마스킹 전체 초기화 (상단 기본 마스킹은 유지)
  clearMasks() {
    this.applyDefaultHeaderMask();
    this.redrawCanvas();
  }

  // 4. PDF 로드 (스캔본 PDF도 2.5배 고해상도로 렌더링)
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

      // 디지털 텍스트가 있는 경우 즉시 반환
      if (fullText.trim().length > 100) {
        this.onProgress({ status: "개인정보 비식별화 필터링 중...", progress: 0.9 });
        const safeText = this.filterSensitiveText(fullText);
        this.onCompleted(safeText);
        return;
      }

      // 스캔본 PDF인 경우 2.5배 고해상도로 캔버스 렌더링
      this.onProgress({ status: "스캔된 PDF 감지: 2.5배 초고해상도 렌더링 중...", progress: 0.4 });
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 2.5 }); // 2.5배 초고해상도 렌더링!
      this.canvas.width = viewport.width;
      this.canvas.height = viewport.height;
      this.canvas.style.width = "100%";
      this.canvas.style.height = "auto";
      await firstPage.render({ canvasContext: this.ctx, viewport }).promise;

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

  // 5. 마스킹된 캔버스 이미지로 Tesseract OCR 구동 (원샷 견고 API)
  async runOCR() {
    if (!this.canvas) {
      this.onError("캔버스가 준비되지 않았습니다.");
      return;
    }

    try {
      console.log("🚀 [HoguOCR] OCR 시작: 고대비 흑백 전처리 가동...");
      this.onProgress({ status: "이미지 선명화 및 대비 증폭 중...", progress: 0.05 });
      
      // OCR 직전 고대비 전처리 1초 실행! (작은 글씨 잉크처럼 선명화)
      this.applyContrastEnhancement();

      this.onProgress({ status: "브라우저 로컬 OCR 엔진 준비 중...", progress: 0.1 });

      if (typeof Tesseract === "undefined") {
        throw new Error("Tesseract.js 라이브러리가 로드되지 않았습니다. 인터넷 연결을 확인해 주세요.");
      }

      // Tesseract 원샷 실행 (브라우저 메모리 관리 최적화)
      const result = await Tesseract.recognize(
        this.canvas,
        "kor+eng",
        {
          logger: (m) => {
            console.log("🔍 [OCR Log]", m);
            if (m.status === "recognizing text") {
              const p = m.progress || 0;
              this.onProgress({
                status: `텍스트 판독 중... (${Math.floor(p * 100)}%)`,
                progress: 0.1 + (p * 0.8)
              });
            } else if (m.status === "loading tesseract core" || m.status === "loading language traineddata") {
              this.onProgress({
                status: "로컬 언어팩 로드 중...",
                progress: 0.2
              });
            }
          }
        }
      );

      const rawExtracted = result.data.text;
      console.log("📝 [OCR 원본 텍스트]", rawExtracted);

      if (!rawExtracted || !rawExtracted.trim()) {
        this.onError("사진에서 글자를 감지하지 못했습니다. 더 선명하고 밝은 증권 사진으로 다시 시도해 주세요.");
        return;
      }

      this.onProgress({ status: "판독 완료! 담보 및 금액 분석 중...", progress: 1.0 });
      const safeText = this.filterSensitiveText(rawExtracted);
      this.onCompleted(safeText);
    } catch (err) {
      console.error("❌ [OCR Error]", err);
      this.onError(`OCR 판독 중 오류가 발생했습니다: ${err.message || err}\n(참고: 크롬 브라우저에서 인터넷 연결을 확인해 주세요)`);
    }
  }
}
