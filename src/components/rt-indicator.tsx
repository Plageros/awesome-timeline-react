import React, { useEffect, useRef, useState } from "react";

const RTIndicator = ({
  tick,
  windowTime,
}: {
  tick: number | null;
  windowTime: number[];
}) => {
  const [currentTime, setCurrentTime] = useState(new Date().getTime() / 1000);
  const [leftOffset, setLeftOffset] = useState(0);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (tick) {
      const leftOffsetTime = currentTime - windowTime[0];
      setLeftOffset(Math.round(leftOffsetTime / tick));
      if (intervalIdRef.current !== null) {
        clearInterval(intervalIdRef.current);
      }
      const intervalId = setInterval(() => {
        setCurrentTime(new Date().getTime() / 1000);
      }, tick * 1000);
      intervalIdRef.current = intervalId;
    }
  }, [tick, windowTime, currentTime]);

  return (
    <>
      {windowTime[0] <= currentTime && currentTime <= windowTime[1] && (
        <>
          <div className="rt-arrow" style={{ left: 86 + leftOffset }}></div>
          <div className="rt-line" style={{ left: 100 + leftOffset }}></div>
        </>
      )}
    </>
  );
};

export default RTIndicator;
