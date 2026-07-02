// Toast Notifications Class
class ToastNotification {
  constructor() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }
  }

  show(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Icon based on type
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-message">${message}</div>
      <button class="toast-close" aria-label="Close notification">&times;</button>
    `;

    this.container.appendChild(toast);

    // Close button event
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => this.remove(toast));

    // Auto dismiss
    setTimeout(() => {
      this.remove(toast);
    }, duration);
  }

  remove(toast) {
    if (toast.parentNode) {
      toast.classList.add('removing');
      toast.addEventListener('transitionend', () => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      });
    }
  }
}

// Export single instance
const toast = new ToastNotification();
window.toast = toast; // expose to window for ease of use
export default toast;
