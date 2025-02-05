from flair.datasets import ColumnCorpus
from flair.embeddings import TransformerWordEmbeddings
from flair.models import SequenceTagger
from flair.trainers import ModelTrainer

columns = {0: "text", 1: "ner"}

corpus = ColumnCorpus("data", columns, train_file="train.txt")

embeddings = TransformerWordEmbeddings("bert-base-uncased")

tag_dictionary = corpus.make_label_dictionary("ner")

tagger = SequenceTagger(
    embeddings=embeddings,
    tag_dictionary=tag_dictionary,
    tag_type="ner",
    use_crf=True,
)

trainer = ModelTrainer(tagger, corpus)
trainer.train(
    "models/smart_ner", learning_rate=0.1, mini_batch_size=8, max_epochs=20, patience=3
)
