FROM python:3.13
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt
CMD ['uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8001']
EXPOSE 8001
