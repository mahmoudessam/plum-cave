"use client";

import React, { forwardRef, Ref, useState, useEffect } from "react";
import { motion } from "framer-motion";

interface DreamyInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  placeholder?: string;
  outlineColor?: string;
  outlineColorHover?: string;
  backgroundColor?: string;
  outerBorderRadius?: string;
  innerBorderRadius?: string;
  padding?: string;
  fontSize?: string;
  multiLine?: boolean;
  multiLineHeight?: number;
  blocked?: boolean;
  disabledOutlineColor?: string;
  presetText?: string;
  readOnly?: boolean;
}

interface DreamyTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  placeholder?: string;
  outlineColor?: string;
  outlineColorHover?: string;
  backgroundColor?: string;
  outerBorderRadius?: string;
  innerBorderRadius?: string;
  padding?: string;
  fontSize?: string;
  multiLineHeight?: number;
  blocked?: boolean;
  disabledOutlineColor?: string;
  presetText?: string;
  readOnly?: boolean;
}

const isRTLChar = (char: string) => {
  const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/; // Detect RTL characters
  return rtlRegex.test(char);
};

const getDirection = (text: string) => {
  return text.split("").some(isRTLChar) ? "rtl" : "ltr";
};

const DreamyInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, DreamyInputProps & DreamyTextAreaProps>(
  (
    {
      placeholder = "",
      outlineColor = "linear-gradient(135deg, #4776cb, #a19fe5, #6cc606)",
      outlineColorHover = "linear-gradient(135deg, #7e9fdb, #c7c5ef, #9af92f)",
      backgroundColor = "#151419",
      outerBorderRadius = "0px",
      innerBorderRadius = "0px",
      padding = "1.1rem",
      fontSize = "1rem",
      multiLine = false,
      multiLineHeight = 5,
      blocked = false,
      disabledOutlineColor = "linear-gradient(135deg, #616161, #616161, #616161)",
      presetText = "",
      readOnly = false,
      type,
      ...props
    },
    ref: Ref<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const [value, setValue] = useState(presetText);
    const [textDirection, setTextDirection] = useState<"ltr" | "rtl">(getDirection(presetText || placeholder));
    const [currentOutlineColor, setCurrentOutlineColor] = useState(outlineColor);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!readOnly) {
        const newValue = e.target.value;

        setValue(newValue);

        // Determine text direction based on input or placeholder depending on type
        if (type === "password") {
          setTextDirection(getDirection(placeholder)); // Use placeholder for password fields
        } else {
          if (newValue) {
            setTextDirection(getDirection(newValue)); // Use actual input for other types
          } else {
            setTextDirection(getDirection(placeholder)); // Fallback to placeholder if input is empty
          }
        }
      }
    };

    useEffect(() => {
      if (type === "password") {
        setTextDirection(getDirection(placeholder)); // Always use placeholder for password fields
      } else if (value) {
        setTextDirection(getDirection(value));
      } else {
        setTextDirection(getDirection(placeholder));
      }
    }, [value, placeholder, type]);

    useEffect(() => {
      setCurrentOutlineColor(blocked ? disabledOutlineColor : outlineColor);
    }, [blocked, disabledOutlineColor, outlineColor]);

    const inputStyle: React.CSSProperties = {
      background: backgroundColor,
      padding: padding,
      border: "0",
      borderRadius: innerBorderRadius,
      width: "100%",
      transition: "300ms",
      color: "#fff",
      fontSize: fontSize,
      direction: textDirection,
      textAlign: textDirection === "rtl" ? ("right" as const) : ("left" as const),
    };

    return (
      <motion.div
        style={{
          position: "relative",
          width: "100%",
          ...(blocked && { pointerEvents: "none", filter: "grayscale(100%)", opacity: 0.5, cursor: "not-allowed" }),
        }}
      >
        <motion.div
          initial={{ backgroundImage: currentOutlineColor }}
          animate={{ backgroundImage: currentOutlineColor }}
          whileHover={{ backgroundImage: blocked ? currentOutlineColor : outlineColorHover }}
          transition={{ duration: 0.3 }}
          style={{
            padding: "1px",
            alignItems: "center",
            textAlign: "center",
            background: "none",
            border: "0",
            borderRadius: outerBorderRadius,
            color: "#f7f7ff",
            fontWeight: "bold",
            display: "flex",
            justifyContent: "center",
            textDecoration: "none",
            userSelect: "none",
            WebkitUserSelect: "none",
            whiteSpace: "nowrap",
            width: "100%",
            ...(blocked && { cursor: "not-allowed" }),
          }}
          onClick={(e) => {
            if (readOnly) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          {multiLine ? (
            <textarea
              ref={ref as React.RefObject<HTMLTextAreaElement>}
              placeholder={placeholder}
              value={value}
              onChange={handleInputChange}
              readOnly={readOnly}
              className={readOnly ? "read-only-input" : ""}
              style={{
                ...inputStyle,
                height:
                  `${multiLineHeight * parseFloat(fontSize) + parseFloat(padding.split("rem")[0]) * 2 * multiLineHeight}rem`,
                resize: "none",
              }}
              {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
            />
          ) : (
            <input
              ref={ref as React.RefObject<HTMLInputElement>}
              type={type}
              placeholder={placeholder}
              value={value}
              onChange={handleInputChange}
              readOnly={readOnly}
              className={readOnly ? "read-only-input" : ""}
              style={{ ...inputStyle, height: "100%" }}
              {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
            />
          )}
        </motion.div>
      </motion.div>
    );
  }
);

DreamyInput.displayName = "DreamyInput";

export default DreamyInput;
