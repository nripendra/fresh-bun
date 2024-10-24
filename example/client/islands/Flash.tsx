import type { ComponentChildren } from "preact";
import React from "preact/compat";
import { useState, useRef, useEffect } from "preact/compat";

interface FlashNotificationProps {
  children: ComponentChildren;
  targetSelector?: string;
  position?: "top" | "bottom" | "left" | "right";
  offsetY?: number;
  offsetX?: number;
  type?: "info" | "notice" | "success" | "warning" | "error" | "alert";
  timeout?: number;

  onClose?: () => void;
}

export const Flash: React.FC<FlashNotificationProps> = ({
  children,
  targetSelector,
  position = "top",
  offsetX = 0,
  offsetY = 0,
  type = "info",
  timeout = 2500,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const notificationRef = useRef<HTMLDivElement>(null);

  const bgColors = {
    info: "bg-blue-50 border-blue-200",
    notice: "bg-blue-50 border-blue-200",
    success: "bg-green-50 border-green-200",
    warning: "bg-yellow-50 border-yellow-200",
    error: "bg-red-50 border-red-200",
    alert: "bg-red-50 border-red-200",
  };

  const textColors = {
    info: "text-blue-800",
    notice: "text-blue-800",
    success: "text-green-800",
    warning: "text-yellow-800",
    error: "text-red-800",
    alert: "text-red-800",
  };

  useEffect(() => {
    const updatePosition = () => {
      if (!targetSelector || !notificationRef.current) return;

      const targetElement = document.querySelector(targetSelector);
      if (!targetElement) return;

      const targetRect = targetElement.getBoundingClientRect();
      const notification = notificationRef.current;

      switch (position) {
        case "top":
          notification.style.top = `${
            targetRect.top - notification.offsetHeight - 8 + offsetY
          }px`;
          notification.style.left = `${
            targetRect.left +
            (targetRect.width - notification.offsetWidth) / 2 +
            offsetX
          }px`;
          break;
        case "bottom":
          notification.style.top = `${targetRect.bottom + 8 + offsetY}px`;
          notification.style.left = `${
            targetRect.left +
            (targetRect.width - notification.offsetWidth) / 2 +
            offsetX
          }px`;
          break;
        case "left":
          notification.style.top = `${
            targetRect.top +
            (targetRect.height - notification.offsetHeight) / 2 +
            offsetY
          }px`;
          notification.style.left = `${
            targetRect.left - notification.offsetWidth - 8 + offsetX
          }px`;
          break;
        case "right":
          notification.style.top = `${
            targetRect.top +
            (targetRect.height - notification.offsetHeight) / 2 +
            offsetY
          }px`;
          notification.style.left = `${targetRect.right + 8 + offsetX}px`;
          break;
      }
      notificationRef.current!.classList.remove("invisible");
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    let timer = setTimeout(handleClose, timeout);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [targetSelector, position]);

  const handleClose = () => {
    notificationRef.current!.addEventListener("transitionend", () => {
      setIsVisible(false);
      onClose?.();
    });
    notificationRef.current!.style.opacity = "0";
  };

  if (!isVisible) return null;

  return (
    <div
      ref={notificationRef}
      className={`invisible min-w-96 fixed z-50 transform transition-all duration-800 ease-in-out
          ${bgColors[type]} border rounded-lg shadow-lg p-4 max-w-sm
          ${targetSelector ? "absolute" : "right-4 top-4"}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* <AlertCircle className={`w-5 h-5 ${textColors[type]}`} /> */}
        {/* <div className="flex-1"></div> */}
        <div className={`text-sm font-medium ${textColors[type]}`}>
          {children}
        </div>
        <button
          onClick={handleClose}
          className={`${textColors[type]} hover:opacity-70 transition-opacity`}
          aria-label="Close notification"
        >
          {/* <X className="w-5 h-5" /> */}
        </button>
      </div>
    </div>
  );
};

export default Flash;
