import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BounceLoader } from 'react-spinners';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const VideoDownloader: React.FC = () => {
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [videoInfo, setVideoInfo] = useState<any>(null);
    const [progress, setProgress] = useState(0);
    const [estimatedTime, setEstimatedTime] = useState<string | null>(null);

    useEffect(() => {
        if (url) {
            fetchVideoInfo(url);
        }
    }, [url]);

    const fetchVideoInfo = async (url: string) => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.post('http://localhost:5000/video-info', { url }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.error) {
                throw new Error(response.data.error);
            }

            setVideoInfo({
                ...response.data,
            });
        } catch (err: any) {
            setError(`Error fetching video info: ${err.message}`);
            toast.error(`Invalid URL: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!url || !videoInfo?.title) {
            setError('URL and video title are required');
            toast.error('URL and video title are required');
            return;
        }

        setLoading(true);
        setError('');
        setProgress(0);
        setEstimatedTime(null);
        setVideoInfo(null); // Clear video info to avoid showing stale info during download

        try {
            const response = await axios.post(
                'http://localhost:5000/download',
                { url, title: videoInfo?.title }, // Use video title to name the downloaded file
                {
                    responseType: 'blob',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    onDownloadProgress: (progressEvent) => {
                        const total = progressEvent.total || 0;
                        const current = progressEvent.loaded;
                        const percent = Math.floor((current / total) * 100);

                        setProgress(percent);

       
                        if (total > 0) {
                            const elapsedTime = (new Date().getTime() - (progressEvent.startTime || new Date().getTime())) / 1000;
                            const totalTime = (elapsedTime / (current / total));
                            const remainingTime = Math.max(totalTime - elapsedTime, 0);
                            setEstimatedTime(formatTime(remainingTime));
                        }
                    }
                }
            );

            const contentDisposition = response.headers['content-disposition'];
            const filename = contentDisposition ? contentDisposition.split('filename=')[1] : videoInfo.title+".mp4";

            if (response.data.size === 0) {
                throw new Error('Received empty file');
            }

            const fileURL = window.URL.createObjectURL(new Blob([response.data], { type: 'video/mp4' }));
            const link = document.createElement('a');
            link.href = fileURL;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(fileURL);


            fetchVideoInfo(url);


            toast.success('Download completed successfully!');

        } catch (err: any) {
            setError(`Error downloading video: ${err.message}`);
            toast.error(`Error downloading video: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handlePaste = async () => {
        try {
            const clipboardText = await navigator.clipboard.readText();
            setUrl(clipboardText);
        } catch (err) {
            toast.error('Failed to paste from clipboard');
        }
    };

    const handleClear = () => {
        setUrl('');
        setVideoInfo(null);
        setError('');
        setProgress(0);
        setEstimatedTime(null);
    };

    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}m ${secs}s`;
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500 to-blue-500 text-white p-4 md:p-8 lg:p-12">
            <div className="w-full max-w-lg bg-gray-800 p-6 rounded-lg shadow-lg">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold mb-6 text-center">Video Downloader</h1>
                <div className="flex items-center mb-4">
                    <input
                        type="text"
                        placeholder="Enter video URL"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="w-full p-3 border text-black border-gray-700 rounded-lg mr-2"
                    />
                    <button
                        onClick={handlePaste}
                        className="p-3 bg-blue-600 text-white rounded-lg"
                    >
                        Paste
                    </button>
                </div>
                {videoInfo && (
                    <div className="mb-4">
                        <img src={videoInfo.thumbnail} alt="Thumbnail" className="w-full h-auto rounded-lg mb-2" />
                        <h2 className="text-xl font-semibold">{videoInfo.title}</h2>
                        {/* <p>{videoInfo.description}</p> */}
                    </div>
                )}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={handleDownload}
                        disabled={loading}
                        className={`w-full p-3 bg-green-600 text-white rounded-lg ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? (
                            <div className="flex items-center justify-center">
                                <BounceLoader color="#ffffff" size={24} />
                                <span className="ml-2">Processing... {progress}%</span>
                            </div>
                        ) : (
                            'Download Video'
                        )}
                    </button>
                    <button
                        onClick={handleClear}
                        className="w-full p-3 bg-red-600 text-white rounded-lg"
                    >
                        Clear
                    </button>
                </div>
                {estimatedTime && (
                    <div className="mt-2 text-gray-200">
                        Estimated Time Left: {estimatedTime}
                    </div>
                )}
                {error && <p className="text-red-400 mt-4">{error}</p>}
            </div>
            <ToastContainer />
        </div>
    );
};

export default VideoDownloader;
