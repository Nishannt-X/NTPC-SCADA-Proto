FROM python:3.11-slim

WORKDIR /app

# Install CPU-only PyTorch first (smaller image)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY inference_server.py .
COPY models/ models/

EXPOSE 8090

CMD ["uvicorn", "inference_server:app", "--host", "0.0.0.0", "--port", "8090"]
