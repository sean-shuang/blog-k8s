FROM docker.m.daocloud.io/library/alpine:3.18
RUN apk add --no-cache nginx
COPY index.html /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
