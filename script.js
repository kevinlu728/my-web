// 照片轮播功能
const carousel = {
    currentIndex: 0,
    images: [
        { url: 'path/to/image1.jpg', caption: '第一张照片描述' },
        { url: 'path/to/image2.jpg', caption: '第二张照片描述' },
        { url: 'path/to/image3.jpg', caption: '第三张照片描述' }
    ],
    
    init() {
        this.container = document.querySelector('.carousel-container');
        this.prevButton = document.querySelector('.carousel-button.prev');
        this.nextButton = document.querySelector('.carousel-button.next');
        
        this.loadImages();
        this.setupEventListeners();
        this.showSlide(0);
    },
    
    loadImages() {
        this.images.forEach((image, index) => {
            const slide = document.createElement('div');
            slide.className = 'carousel-slide';
            slide.innerHTML = `
                <img src="${image.url}" alt="照片 ${index + 1}">
                <p class="caption">${image.caption}</p>
            `;
            this.container.appendChild(slide);
        });
    },
    
    setupEventListeners() {
        this.prevButton.addEventListener('click', () => this.prevSlide());
        this.nextButton.addEventListener('click', () => this.nextSlide());
    },
    
    showSlide(index) {
        this.currentIndex = index;
        this.container.style.transform = `translateX(-${index * 100}%)`;
    },
    
    prevSlide() {
        const newIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
        this.showSlide(newIndex);
    },
    
    nextSlide() {
        const newIndex = (this.currentIndex + 1) % this.images.length;
        this.showSlide(newIndex);
    }
};

// 页面加载完成后初始化轮播
document.addEventListener('DOMContentLoaded', () => {
    carousel.init();
}); 