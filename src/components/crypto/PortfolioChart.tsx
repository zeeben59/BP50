import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, AreaSeries, AreaData } from 'lightweight-charts';

interface PortfolioChartProps {
    data: { time: any; value: number }[];
    height?: number;
}

const PortfolioChart: React.FC<PortfolioChartProps> = ({ data, height = 300 }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<any> | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { color: 'transparent' },
                textColor: '#64748b',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.02)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.02)' },
            },
            rightPriceScale: {
                borderVisible: false,
                scaleMargins: {
                    top: 0.2,
                    bottom: 0.2,
                },
            },
            timeScale: {
                borderVisible: false,
                timeVisible: true,
                secondsVisible: false,
            },
            handleScroll: false,
            handleScale: false,
        });

        const series = chart.addSeries(AreaSeries, {
            lineColor: '#10b981',
            topColor: 'rgba(16, 185, 129, 0.2)',
            bottomColor: 'rgba(16, 185, 129, 0.0)',
            lineWidth: 2,
        });

        series.setData(data as AreaData[]);

        chartRef.current = chart;
        seriesRef.current = series;

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);
        chart.timeScale().fitContent();

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data]);

    return <div ref={chartContainerRef} className="w-full" style={{ height }} />;
};

export default PortfolioChart;
