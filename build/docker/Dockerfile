FROM ubuntu:20.04

ADD . /botpress
WORKDIR /botpress

RUN apt update
RUN apt install -y wget ca-certificates
RUN update-ca-certificates
RUN wget -O duckling https://s3.amazonaws.com/botpress-binaries/duckling-example-exe
RUN chmod +x duckling
RUN chmod +x bp
RUN chgrp -R 0 /botpress
RUN chmod -R g=u /botpress
RUN apt install -y tzdata
RUN ln -fs /usr/share/zoneinfo/UTC /etc/localtime
RUN dpkg-reconfigure --frontend noninteractive tzdata
RUN ./bp extract


ENV BP_MODULE_NLU_DUCKLINGURL=http://localhost:8000
ENV BP_IS_DOCKER=true

ENV LANG=C.UTF-8
EXPOSE 3000

CMD ./duckling & ./bp